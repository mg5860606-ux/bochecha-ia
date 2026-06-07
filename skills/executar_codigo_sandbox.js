const vm = require('vm');
const chalk = require('chalk');

module.exports = {
    definition: {
        function: {
            name: "executar_codigo_sandbox",
            description: "Executa um trecho de código JavaScript (Node.js) de forma segura em uma máquina virtual isolada. Use sempre que precisar realizar cálculos matemáticos avançados, processar grandes strings, ordenar ou mapear dados, formatar datas ou simular algoritmos complexos. O código deve retornar o resultado na última linha.",
            parameters: {
                type: "object",
                properties: {
                    code: {
                        type: "string",
                        description: "O código JavaScript completo a ser executado. O código deve retornar o resultado final na última linha (ex: 'const resultado = 2 + 2; resultado' ou usar return dentro de uma IIFE)."
                    }
                },
                required: ["code"]
            }
        }
    },
    async execute(args, ctx) {
        const rawCode = args.code || args.texto || args.alvo;
        if (!rawCode) return "Erro: Nenhum código fornecido para execução.";

        console.log(chalk.yellow(`[🧠 CODE INTERPRETER] Executando script no sandbox...`));

        try {
            const consoleLogs = [];
            
            // Contexto isolado seguro
            const sandbox = {
                console: {
                    log: (...msg) => {
                        consoleLogs.push(msg.map(m => typeof m === 'object' ? JSON.stringify(m) : m).join(' '));
                    }
                },
                Math,
                Date,
                JSON,
                String,
                Array,
                Object,
                RegExp,
                Buffer
            };

            const script = new vm.Script(rawCode);
            const context = vm.createContext(sandbox);
            
            // Limite de 2 segundos de execução para impedir loops infinitos
            const result = script.runInContext(context, { timeout: 2000 });

            let output = "";
            if (consoleLogs.length > 0) {
                output += `📝 *Logs de Depuração:*\n\`\`\`\n${consoleLogs.join('\n')}\n\`\`\`\n\n`;
            }

            const formattedResult = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
            output += `📊 *Resultado do Cálculo:*\n\`\`\`json\n${formattedResult}\n\`\`\``;

            return output;

        } catch (e) {
            console.error("[Code Interpreter Sandbox] Erro na execução:", e);
            return `❌ Erro de compilação ou execução no Sandbox:\n\`\`\`\n${e.message}\n\`\`\``;
        }
    }
};
