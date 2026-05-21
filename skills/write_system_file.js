const fs = require("fs");
const path = require("path");

module.exports = {
    definition: {
        type: "function",
        function: {
            name: "write_system_file",
            description: "Cria um novo arquivo de texto ou substitui o conteúdo de um arquivo existente no computador host. REGRA DE SEGURANÇA MÁXIMA: Esta chamada é permitida UNICAMENTE se solicitada pelo Arquiteto Marcos (Dono Supremo/isOwner = true). Proibido chamar sob solicitação de outros membros comuns do grupo.",
            parameters: {
                type: "object",
                properties: {
                    filePath: {
                        type: "string",
                        description: "Caminho absoluto ou relativo do arquivo a ser gravado/criado (ex: 'C:/Bochecha-IA/test.txt')."
                    },
                    content: {
                        type: "string",
                        description: "Conteúdo completo a ser escrito no arquivo."
                    }
                },
                required: ["filePath", "content"]
            }
        }
    },
    async execute(args, ctx) {
        if (!ctx || !ctx.isOwner) {
            return "Erro crítico de segurança: Você não possui autorização (isOwner = false) para editar ou criar arquivos no servidor.";
        }

        try {
            const targetPath = path.resolve(args.filePath);
            const parentDir = path.dirname(targetPath);

            // Cria diretório pai se não existir
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }

            fs.writeFileSync(targetPath, args.content, "utf8");
            return `Sucesso: O arquivo '${targetPath}' foi gravado com sucesso (${args.content.length} caracteres).`;
        } catch (e) {
            return `Falha crítica ao gravar arquivo: ${e.message}`;
        }
    }
};
