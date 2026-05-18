const { UniversalEdgeTTS } = require('edge-tts-universal');
const fs = require('fs');
const path = require('path');

async function test() {
  try {
    console.log("Iniciando teste de Edge-TTS...");
    const tts = new UniversalEdgeTTS('salve cria! aqui é o bochecha, a inteligência mais braba do whatsapp!', 'pt-BR-AntonioNeural');
    const result = await tts.synthesize();
    console.log("Síntese concluída! Conversor Blob -> Buffer...");
    
    // Converte Blob para Buffer
    const arrayBuffer = await result.audio.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log("Tamanho do buffer recebido:", buffer.length, "bytes");
    
    // Salva o arquivo de teste localmente
    const outputPath = path.join(__dirname, 'test_output.mp3');
    fs.writeFileSync(outputPath, buffer);
    console.log("Arquivo salvo com sucesso em:", outputPath);
  } catch (err) {
    console.error("Erro durante o teste:", err);
  }
}

test();
