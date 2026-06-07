const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

module.exports = {
    definition: {
        type: "function",
        function: {
            name: "download_from_internet",
            description: "Faz o download de um arquivo a partir de uma URL da internet e salva no computador host. REGRA DE SEGURANÇA MÁXIMA: Esta chamada é permitida UNICAMENTE se solicitada pelo Arquiteto Marcos (Dono Supremo/isOwner = true). Proibido chamar sob solicitação de outros membros comuns do grupo.",
            parameters: {
                type: "object",
                properties: {
                    url: {
                        type: "string",
                        description: "URL direta de download do arquivo (ex: 'https://exemplo.com/imagem.png')."
                    },
                    destPath: {
                        type: "string",
                        description: "Caminho relativo ou absoluto onde o arquivo deve ser salvo (ex: 'downloads/imagem.png' ou './skills/nova_ferramenta.js'). Se omitido, salva na pasta raiz do bot com o nome original do arquivo."
                    }
                },
                required: ["url"]
            }
        }
    },
    async execute(args, ctx) {
        if (!ctx || !ctx.isOwner) {
            return "Erro crítico de segurança: Você não possui autorização (isOwner = false) para baixar arquivos na máquina do servidor.";
        }

        const fileUrl = args.url || args.texto || args.alvo || '';
        let dest = args.destPath;

        if (!dest) {
            const urlParts = fileUrl.split("/");
            const originalName = urlParts[urlParts.length - 1] || "downloaded_file";
            dest = path.join(".", originalName);
        }

        const targetPath = path.resolve(dest);
        const parentDir = path.dirname(targetPath);

        // Garante a existência do diretório pai
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        return new Promise((resolve) => {
            const client = fileUrl.startsWith("https") ? https : http;
            
            client.get(fileUrl, { timeout: 30000 }, (res) => {
                if (res.statusCode !== 200) {
                    resolve(`Erro ao baixar arquivo: O servidor respondeu com status ${res.statusCode}`);
                    return;
                }

                const fileStream = fs.createWriteStream(targetPath);
                res.pipe(fileStream);

                fileStream.on("finish", () => {
                    fileStream.close();
                    const size = fs.statSync(targetPath).size;
                    resolve(`Sucesso: O arquivo foi baixado e salvo em '${targetPath}' (${(size / 1024).toFixed(2)} KB).`);
                });

                fileStream.on("error", (err) => {
                    fs.unlink(targetPath, () => {});
                    resolve(`Erro de escrita ao salvar arquivo no disco: ${err.message}`);
                });
            }).on("error", (err) => {
                resolve(`Erro de rede ao tentar baixar o arquivo: ${err.message}`);
            });
        });
    }
};
