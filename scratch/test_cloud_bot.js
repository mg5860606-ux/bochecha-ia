const chalk = require('chalk');

async function test() {
  console.log(chalk.cyan("=================================================="));
  console.log(chalk.cyan("      VALIDAÇÃO DE CONEXÃO E CHAVES EM NUVEM"));
  console.log(chalk.cyan("=================================================="));

  console.log("\n[🤖 TESTE] Inicializando o apiKeyManager...");
  const apiKeyManager = require('../apiKeyManager');
  
  // Aguarda 4 segundos para dar tempo do Firestore responder em background
  console.log("[🤖 TESTE] Aguardando 4 segundos para a sincronização em background finalizar...");
  await new Promise(resolve => setTimeout(resolve, 4000));

  const keys = apiKeyManager.listKeys();
  const claudekeys = apiKeyManager.listClaudeKeys();
  
  console.log(chalk.cyan("\n=================== RESULTADOS ==================="));
  console.log(chalk.green(`[🤖 TESTE] Chaves Gemini no Pool Nuvem/Local: ${keys.length}`));
  keys.forEach((k, i) => console.log(`  - Gemini [${i}]: ${k.substring(0, 15)}...`));

  console.log(chalk.green(`[🤖 TESTE] Chaves Claude no Pool Nuvem/Local: ${claudekeys.length}`));
  claudekeys.forEach((k, i) => console.log(`  - Claude [${i}]: ${k.substring(0, 15)}...`));

  if (keys.length > 0 || claudekeys.length > 0) {
    console.log(chalk.green("\n[🔥 SUCESSO] Conectado e sincronizado com o Cloud Firestore!"));
  } else {
    console.log(chalk.red("\n[❌ AVISO] Nenhuma chave encontrada. Verifique se o seu key.json local possui chaves válidas."));
  }
  console.log(chalk.cyan("=================================================="));
  process.exit(0);
}

test();
