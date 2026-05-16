const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database_games.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ forca: {} }));

module.exports = {
    definition: {
        function: {
            name: "jogo_forca",
            description: "Gerencia um jogo da forca (Hangman). O bot pode iniciar, processar uma tentativa de letra, ou encerrar o jogo.",
            parameters: {
                type: "object",
                properties: {
                    acao: { type: "string", enum: ["iniciar", "tentar_letra", "encerrar"], description: "Ação a ser feita" },
                    letra: { type: "string", description: "A letra que o usuário quer tentar (apenas 1 letra). Obrigatório se acao = tentar_letra" },
                    palavra_secreta: { type: "string", description: "Uma palavra secreta que VOCÊ (IA) escolhe (sem acentos) para o jogo. Obrigatório se acao = iniciar" },
                    dica: { type: "string", description: "A dica da palavra secreta escolhida por você. Obrigatório se acao = iniciar" }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { sock, from, sender }) {
        let db = JSON.parse(fs.readFileSync(dbPath));
        if (!db.forca) db.forca = {};
        
        if (args.acao === "iniciar") {
            if (db.forca[from] && db.forca[from].ativa) return "Aviso: Já existe um jogo de forca rolando neste grupo!";
            if (!args.palavra_secreta || !args.dica) return "Erro: você não forneceu a palavra secreta ou a dica.";
            
            const secreta = args.palavra_secreta.toLowerCase().replace(/[^a-z0-9]/g, '');
            db.forca[from] = {
                ativa: true,
                palavra: secreta,
                dica: args.dica,
                letras_descobertas: [],
                erros: 0,
                max_erros: 6
            };
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            
            let oculta = secreta.split('').map(() => '_').join(' ');
            await sock.sendMessage(from, { text: `🎯 *JOGO DA FORCA INICIADO!* 🎯\n\nO Bochecha pensou numa palavra!\n\n💡 Dica: ${args.dica}\n❓ Palavra: ${oculta}\n\nPara jogar, diga: "Bochecha, tenta a letra A".` });
            return "Jogo iniciado com sucesso.";
        }
        
        if (args.acao === "tentar_letra") {
            if (!db.forca[from] || !db.forca[from].ativa) return "Aviso: Não há nenhum jogo de forca rolando. Peça para o bot iniciar um.";
            
            const jogo = db.forca[from];
            const letra = args.letra ? args.letra.toLowerCase()[0] : "";
            if (!letra) return "Aviso: Nenhuma letra foi fornecida.";
            
            if (jogo.letras_descobertas.includes(letra)) return "Aviso ao usuário: Essa letra já foi descoberta ou tentada. Tente outra.";
            
            jogo.letras_descobertas.push(letra);
            
            if (!jogo.palavra.includes(letra)) {
                jogo.erros += 1;
            }
            
            let venceu = true;
            let oculta = "";
            for (let char of jogo.palavra) {
                if (jogo.letras_descobertas.includes(char)) {
                    oculta += char.toUpperCase() + " ";
                } else {
                    oculta += "_ ";
                    venceu = false;
                }
            }
            
            let msg = `🎯 *FORCA* 🎯\n\n💡 Dica: ${jogo.dica}\n❓ Palavra: ${oculta}\n\n❌ Erros: ${jogo.erros}/${jogo.max_erros}\n🔤 Letras tentadas: ${jogo.letras_descobertas.join(',').toUpperCase()}\n`;
            
            if (venceu) {
                msg += `\n🎉 *VITÓRIA!* @${sender.split('@')[0]} acertou a última letra! A palavra era ${jogo.palavra.toUpperCase()}!`;
                jogo.ativa = false;
            } else if (jogo.erros >= jogo.max_erros) {
                msg += `\n💀 *ENFORCADO!* Vocês perderam. A palavra era ${jogo.palavra.toUpperCase()}!`;
                jogo.ativa = false;
            }
            
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            
            if (venceu || jogo.erros >= jogo.max_erros) {
                 await sock.sendMessage(from, { text: msg, mentions: [sender] });
            } else {
                 await sock.sendMessage(from, { text: msg });
            }
            
            return `A letra foi tentada. O jogo foi atualizado na tela do usuário. ${venceu ? "Eles venceram." : ""} ${jogo.erros >= jogo.max_erros ? "Eles perderam." : ""}`;
        }
        
        if (args.acao === "encerrar") {
            if (!db.forca[from]) db.forca[from] = {};
            db.forca[from].ativa = false;
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            await sock.sendMessage(from, { text: "🛑 Jogo da forca encerrado à força pelo Bochecha." });
            return "Jogo encerrado.";
        }
    }
};
