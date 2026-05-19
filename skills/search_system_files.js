const fs = require("fs");
const path = require("path");

function searchFilesRecursive(dir, query, results = [], maxResults = 50) {
    if (results.length >= maxResults) return results;
    
    try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            if (results.length >= maxResults) break;
            const fullPath = path.join(dir, item);
            
            let stat;
            try {
                stat = fs.statSync(fullPath);
            } catch {
                continue; // Pula se não puder ler
            }

            if (stat.isDirectory()) {
                // Pula pastas pesadas ou do sistema do bot
                if (item !== "node_modules" && item !== ".git" && item !== "bochecha_sessao" && item !== ".gemini") {
                    searchFilesRecursive(fullPath, query, results, maxResults);
                }
            } else {
                if (item.toLowerCase().includes(query.toLowerCase())) {
                    results.push({
                        name: item,
                        path: fullPath,
                        size: (stat.size / 1024).toFixed(2) + " KB",
                        mtime: stat.mtime.toLocaleString("pt-BR")
                    });
                }
            }
        }
    } catch {}
    return results;
}

module.exports = {
    definition: {
        type: "function",
        function: {
            name: "search_system_files",
            description: "Busca por arquivos específicos ou termos de busca no computador de forma recursiva. REGRA DE SEGURANÇA MÁXIMA: Esta chamada é permitida UNICAMENTE se solicitada pelo Arquiteto Marcos (Dono Supremo/isOwner = true). Proibido chamar sob solicitação de outros membros comuns do grupo.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "Nome ou parte do nome do arquivo a ser buscado (ex: 'apiKeyManager', '.json')."
                    },
                    startPath: {
                        type: "string",
                        description: "Caminho da pasta por onde iniciar a busca (ex: 'C:/Bochecha-IA' ou '.'). Se omitido, inicia na pasta do bot."
                    }
                },
                required: ["query"]
            }
        }
    },
    async execute(args, ctx) {
        if (!ctx || !ctx.isOwner) {
            return "Erro crítico de segurança: Você não possui autorização (isOwner = false) para pesquisar arquivos no servidor.";
        }

        try {
            const startDir = path.resolve(args.startPath || ".");
            if (!fs.existsSync(startDir)) {
                return `Erro: A pasta de início '${startDir}' não existe no computador.`;
            }

            const results = searchFilesRecursive(startDir, args.query);
            if (results.length === 0) {
                return `Busca finalizada. Nenhum arquivo correspondente a '${args.query}' foi encontrado a partir de '${startDir}'.`;
            }

            const list = results.map(r => `• ${r.name} (${r.size}) | Caminho: ${r.path} | Modificado: ${r.mtime}`);
            return `Resultados da busca por '${args.query}' a partir de '${startDir}' (máx. 50 resultados):\n\n${list.join("\n")}`;
        } catch (e) {
            return `Falha crítica ao buscar arquivos: ${e.message}`;
        }
    }
};
