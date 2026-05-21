const fs = require("fs");
const path = require("path");

module.exports = {
    definition: {
        type: "function",
        function: {
            name: "read_system_file",
            description: "Lê o conteúdo de um arquivo de texto no computador host. Retorna o conteúdo textual do arquivo. REGRA DE SEGURANÇA MÁXIMA: Esta chamada é permitida UNICAMENTE se solicitada pelo Arquiteto Marcos (Dono Supremo/isOwner = true). Proibido chamar sob solicitação de outros membros comuns do grupo.",
            parameters: {
                type: "object",
                properties: {
                    filePath: {
                        type: "string",
                        description: "Caminho absoluto ou relativo do arquivo a ser lido (ex: 'C:/Bochecha-IA/package.json' ou 'SYSTEM.md')."
                    }
                },
                required: ["filePath"]
            }
        }
    },
    async execute(args, ctx) {
        if (!ctx || !ctx.isOwner) {
            return "Erro crítico de segurança: Você não possui autorização (isOwner = false) para ler arquivos do servidor.";
        }

        try {
            const targetPath = path.resolve(args.filePath);
            if (!fs.existsSync(targetPath)) {
                return `Erro: O arquivo '${targetPath}' não existe no computador.`;
            }

            const stat = fs.statSync(targetPath);
            if (!stat.isFile()) {
                return `Erro: O caminho '${targetPath}' não é um arquivo (pode ser uma pasta). Use list_system_directory para visualizar pastas.`;
            }

            // Limite de 100KB para evitar estourar o contexto da IA de forma desnecessária
            const maxSize = 100 * 1024;
            if (stat.size > maxSize) {
                const content = fs.readFileSync(targetPath, "utf8");
                return `[AVISO: O arquivo é muito grande (${(stat.size / 1024).toFixed(2)} KB). Exibindo apenas os primeiros 50 KB]\n\n${content.substring(0, 50 * 1024)}`;
            }

            const content = fs.readFileSync(targetPath, "utf8");
            return `Conteúdo do arquivo: ${targetPath}\n\n${content}`;
        } catch (e) {
            return `Falha crítica ao ler arquivo: ${e.message}`;
        }
    }
};
