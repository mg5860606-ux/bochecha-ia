const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');

console.log("Caminho do FFmpeg Estático localizado:", ffmpegPath);

function generateVideoFromImage(imagePath, outputPath) {
    return new Promise((resolve, reject) => {
        // z='min(zoom+0.0015,1.2)' -> zoom suave até 1.2x
        // d=125 -> duração de 125 frames (5 segundos a 25 fps)
        const ffmpeg = spawn(ffmpegPath, [
            '-y',
            '-loop', '1',
            '-i', imagePath,
            '-vf', "zoompan=z='min(zoom+0.0015,1.2)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=512x512,format=yuv420p",
            '-c:v', 'libx264',
            '-t', '5',
            '-pix_fmt', 'yuv420p',
            '-r', '25',
            outputPath
        ]);

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`FFmpeg exit code ${code}`));
            }
        });

        ffmpeg.on('error', (err) => {
            reject(err);
        });
    });
}

async function test() {
    try {
        console.log("Iniciando teste de geração de vídeo...");
        const testImage = path.join(__dirname, 'test_image.jpg');
        const outputVideo = path.join(__dirname, 'test_video_output.mp4');
        
        console.log("Rodando FFmpeg Estático para criar vídeo...");
        await generateVideoFromImage(testImage, outputVideo);
        
        console.log("Vídeo gerado com sucesso em:", outputVideo);
        console.log("Tamanho do vídeo:", fs.statSync(outputVideo).size, "bytes");
    } catch (err) {
        console.error("Erro no teste de vídeo:", err);
    }
}

test();
