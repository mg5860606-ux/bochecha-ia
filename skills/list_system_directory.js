const fs = require("fs");
const path = require("path");

module.exports = {
    definition: {
        type: "function",
        function: {
            name: "list_system_directory",
            description: "Lista o conteúdo de um diretório/pasta no computador host. Retorna arquivos, subpastas, tamanhos e datas de modificação. REGRA DE SEGURANÇA MÁXIMA: Esta chamada é permitida UNICAMENTE se solicitada pelo Arquiteto Marcos (Dono Supremo/isOwner = true). Proibido chamar sob solicitação de outros membros comuns do grupo.",
            parameters: {
                type: "object",
                properties: {
                    dirPath: {
                        type: "string",
                        description: "Caminho absoluto ou relativo do diretório a ser listado (ex: 'C:/Bochecha-IA' ou './skills'). Se vazio, lista a pasta atual do bot."
                    }
                },
                required: []
            }
        }
    },
    async execute(args, ctx) {
        if (!ctx || !ctx.isOwner) {
            return "Erro crítico de segurança: Você não possui autorização (isOwner = false) para visualizar pastas do servidor.";
        }

        try {
            const targetPath = path.resolve(args.dirPath || ".");
            if (!fs.existsSync(targetPath)) {
                return `Erro: O caminho '${targetPath}' não existe no computador.`;
            }

            const stat = fs.statSync(targetPath);
            if (!stat.isDirectory()) {
                return `Erro: O caminho '${targetPath}' não é um diretório, é um arquivo.`;
            }

            const items = fs.readdirSync(targetPath);
            if (items.length === 0) {
                return `O diretório '${targetPath}' está vazio.`;
            }

            const list = [];
            for (const item of items) {
                try {
                    const itemPath = path.join(targetPath, item);
                    const itemStat = fs.statSync(itemPath);
                    const isDir = itemStat.isDirectory();
                    const size = isDir ? "-" : `${(itemStat.size / 1024).toFixed(2)} KB`;
                    const mtime = itemStat.mtime.toLocaleString("pt-BR");
                    list.push(`${isDir ? "[PASTA]" : "[ARQ]  "} ${item.padEnd(35)} | Tam: ${size.padEnd(12)} | Modificado: ${mtime}`);
                } catch {
                    list.push(`[ERRO]  ${item} (Sem permissão de acesso)`);
                }
            }

            return `Conteúdo do diretório: ${targetPath}\n\n${list.join("\n")}`;
        } catch (e) {
            return `Falha crítica ao listar diretório: ${e.message}`;
        }
    }
};
