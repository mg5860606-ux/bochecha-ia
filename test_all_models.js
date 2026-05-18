const apiKeyManager = require("./apiKeyManager");
const chalk = require("chalk");

// Importa o fetch nativo ou cai para node-fetch
const apiFetch = typeof fetch === 'function' ? fetch : require('node-fetch');

const models = [
    "anthropic/claude-3.7-sonnet",
    "anthropic/claude-3.7-sonnet:thinking",
    "openai/o3-mini",
    "deepseek/deepseek-r1:free",
    "deepseek/deepseek-r1",
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4o",
    "openai/gpt-4o-mini:free",
    "google/gemini-2.5-pro:free",
    "google/gemini-2.5-flash:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen-2.5-coder-32b-instruct:free",
    "google/gemini-2.5-flash:free",
    "google/gemma-4-31b-it:free",
    "poolside/laguna-m.1:free",
    "openrouter/free",
    "deepseek/deepseek-v4-flash:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "qwen/qwen3-coder:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "liquid/lfm-2.5-1.2b-thinking:free",
    "liquid/lfm-2.5-1.2b-instruct:free",
    "google/gemma-4-26b-a4b-it:free",
    "poolside/laguna-xs.2:free",
    "z-ai/glm-4.5-air:free",
    "openai/gpt-oss-120b:free",
    "openai/gpt-oss-20b:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "minimax/minimax-m2.5:free",
    "baidu/cobuddy:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "nvidia/nemotron-nano-9b-v2:free",
    "nvidia/nemotron-nano-12b-v2-vl:free"
];

async function runTests() {
    const keys = apiKeyManager.listKeys();
    if (!keys || keys.length === 0) {
        console.log(chalk.red("\n❌ Nenhuma chave do OpenRouter configurada! Adicione uma chave primeiro usando /addkey ou no painel."));
        return;
    }

    const activeKey = keys[0];
    console.log(chalk.cyan(`\n======================================================`));
    console.log(chalk.cyan(`   ⚡ INICIANDO TESTE DOS MODELOS GRÁTIS DO OPENROUTER`));
    console.log(chalk.cyan(`======================================================`));
    console.log(chalk.yellow(`Chave de Teste: ${activeKey.substring(0, 10)}... (Total: ${keys.length} chaves disponíveis)\n`));

    const results = [];

    for (const model of models) {
        process.stdout.write(chalk.gray(`Testando [${model}]... `));
        const startTime = Date.now();

        try {
            const response = await apiFetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${activeKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: "oi" }],
                    max_tokens: 5
                })
            });

            const latency = Date.now() - startTime;

            if (response.ok) {
                const data = await response.json();
                const reply = data.choices?.[0]?.message?.content || "";
                console.log(chalk.green(`✅ ATIVO (${latency}ms) -> "${reply.trim().replace(/\n/g, ' ')}"`));
                results.push({ model, status: "ONLINE", latency: `${latency}ms`, details: reply.trim() });
            } else {
                const errText = await response.text();
                let briefErr = errText.substring(0, 60);
                try {
                    const parsed = JSON.parse(errText);
                    briefErr = parsed.error?.message || briefErr;
                } catch {}
                console.log(chalk.red(`❌ FALHOU -> ${briefErr}`));
                results.push({ model, status: "FAIL", latency: "-", details: briefErr });
            }
        } catch (e) {
            console.log(chalk.red(`❌ ERRO RED -> ${e.message}`));
            results.push({ model, status: "FAIL", latency: "-", details: e.message });
        }
    }

    console.log(chalk.cyan(`\n======================================================`));
    console.log(chalk.cyan(`             📊 RELATÓRIO FINAL DE PERFORMANCE`));
    console.log(chalk.cyan(`======================================================`));
    console.table(results.map(r => ({
        "Modelo": r.model,
        "Status": r.status === "ONLINE" ? "✅ ONLINE" : "❌ FALHOU",
        "Latência": r.latency,
        "Resposta/Erro": r.details.substring(0, 50)
    })));
}

runTests();
