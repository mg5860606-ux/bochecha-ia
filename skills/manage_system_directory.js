const fs = require("fs");
const path = require("path");

module.exports = {
    definition: {
        type: "function",
        function: {
            name: "manage_system_directory",
            description: "Permite criar, renomear ou deletar pastas e arquivos no computador host. REGRA DE SEGURANÇA MÁXIMA: Esta chamada é permitida UNICAMENTE se solicitada pelo Arquiteto Marcos (Dono Supremo/isOwner = true). Proibido chamar sob solicitação de outros membros comuns do grupo.",
            parameters: {
                type: "object",
                properties: {
                    action: {
                        type: "string",
                        description: "Ação a ser executada: 'create' (criar pasta), 'delete' (deletar pasta/arquivo), 'rename' (renomear/mover) ou 'copy' (copiar arquivo/pasta).",
                        enum: ["create", "delete", "rename", "copy"]
                    },
                    targetPath: {
                        type: "string",
                        description: "Caminho absoluto ou relativo do alvo da ação (ex: 'C:/Bochecha-IA/nova_pasta')."
                    },
                    destinationPath: {
                        type: "string",
                        description: "Caminho de destino (obrigatório para as ações 'rename' e 'copy')."
                    }
                },
                required: ["action", "targetPath"]
            }
        }
    },
    async execute(args, ctx) {
        if (!ctx || !ctx.isOwner) {
            return "Erro crítico de segurança: Você não possui autorização (isOwner = false) para gerenciar diretórios no servidor.";
        }

        const action = args.action;
        const target = path.resolve(args.targetPath);

        try {
            if (action === "create") {
                if (fs.existsSync(target)) {
                    return `Erro: O caminho '${target}' já existe no computador.`;
                }
                fs.mkdirSync(target, { recursive: true });
                return `Sucesso: O diretório '${target}' foi criado com sucesso.`;
            } 
            
            if (action === "delete") {
                if (!fs.existsSync(target)) {
                    return `Erro: O caminho '${target}' não existe no computador, não pode ser deletado.`;
                }
                const stat = fs.statSync(target);
                if (stat.isDirectory()) {
                    // Tenta usar fs.rmSync se disponível, senão fs.rmdirSync
                    if (typeof fs.rmSync === "function") {
                        fs.rmSync(target, { recursive: true, force: true });
                    } else {
                        fs.rmdirSync(target, { recursive: true });
                    }
                    return `Sucesso: A pasta '${target}' e todo seu conteúdo foram deletados com sucesso.`;
                } else {
                    fs.unlinkSync(target);
                    return `Sucesso: O arquivo '${target}' foi deletado com sucesso.`;
                }
            } 
            
            if (action === "rename") {
                if (!args.destinationPath) {
                    return "Erro: O argumento 'destinationPath' é obrigatório para renomear/mover.";
                }
                const dest = path.resolve(args.destinationPath);
                if (!fs.existsSync(target)) {
                    return `Erro: O caminho de origem '${target}' não existe.`;
                }
                const parentDest = path.dirname(dest);
                if (!fs.existsSync(parentDest)) {
                    fs.mkdirSync(parentDest, { recursive: true });
                }
                fs.renameSync(target, dest);
                return `Sucesso: '${target}' foi renomeado/movido para '${dest}' com sucesso.`;
            }

            if (action === "copy") {
                if (!args.destinationPath) {
                    return "Erro: O argumento 'destinationPath' é obrigatório para copiar.";
                }
                const dest = path.resolve(args.destinationPath);
                if (!fs.existsSync(target)) {
                    return `Erro: O caminho de origem '${target}' não existe.`;
                }
                const parentDest = path.dirname(dest);
                if (!fs.existsSync(parentDest)) {
                    fs.mkdirSync(parentDest, { recursive: true });
                }
                
                const stat = fs.statSync(target);
                if (stat.isDirectory()) {
                    if (typeof fs.cpSync === "function") {
                        fs.cpSync(target, dest, { recursive: true });
                    } else {
                        const copyFolderRecursiveSync = (src, targetFolder) => {
                            if (!fs.existsSync(targetFolder)) {
                                fs.mkdirSync(targetFolder);
                            }
                            const files = fs.readdirSync(src);
                            files.forEach((file) => {
                                const curSource = path.join(src, file);
                                const curTarget = path.join(targetFolder, file);
                                if (fs.lstatSync(curSource).isDirectory()) {
                                    copyFolderRecursiveSync(curSource, curTarget);
                                } else {
                                    fs.copyFileSync(curSource, curTarget);
                                }
                            });
                        };
                        copyFolderRecursiveSync(target, dest);
                    }
                    return `Sucesso: A pasta '${target}' foi copiada para '${dest}' com sucesso.`;
                } else {
                    fs.copyFileSync(target, dest);
                    return `Sucesso: O arquivo '${target}' foi copiado para '${dest}' com sucesso.`;
                }
            }

            return `Erro: Ação '${action}' desconhecida ou inválida.`;
        } catch (e) {
            return `Falha crítica ao gerenciar diretório/arquivo: ${e.message}`;
        }
    }
};
