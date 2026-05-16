const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database_security.json');

module.exports = {
    definition: {
        function: {
            name: "configurar_bv",
            description: "Configura os modelos e legendas de Boas-Vindas (BV1 com foto, BV2 só texto).",
            parameters: {
                type: "object",
                properties: {
                    modelo: { type: "number", enum: [1, 2], description: "O modelo de BV a ser usado (1 ou 2)." },
                    legenda: { type: "string", description: "O texto da legenda (use @user para mencionar o novato)." },
                    acao: { type: "string", enum: ["definir_modelo", "definir_legenda"], description: "Ação a ser feita." }
                },
                required: ["acao"]
            }
        }
    },
    async execute(args, { from }) {
        let db = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath)) : {};
        if (!db[from]) db[from] = {};

        if (args.acao === "definir_modelo") {
            db[from].modelo_bv = args.modelo;
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            return `✅ *MODELO DE BV DEFINIDO!* O grupo agora usará o Modelo ${args.modelo} (${args.modelo === 1 ? 'Foto + Texto' : 'Apenas Texto'}).`;
        }

        if (args.acao === "definir_legenda") {
            if (!args.modelo) return "❌ Informe se é para a legenda 1 ou 2.";
            const campo = args.modelo === 1 ? 'legenda_bv1' : 'legenda_bv2';
            db[from][campo] = args.legenda;
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            return `✅ *LEGENDA BV${args.modelo} ATUALIZADA!*`;
        }
    }
};
