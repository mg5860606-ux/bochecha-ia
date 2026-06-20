const chalk = require('chalk');

function chunkParticipants(participants, size = 12) {
    if (!Array.isArray(participants)) return [];
    const safeSize = Math.max(1, Number(size) || 12);
    const chunks = [];
    for (let index = 0; index < participants.length; index += safeSize) {
        chunks.push(participants.slice(index, index + safeSize));
    }
    return chunks;
}

function buildTagAllText(names, customMessage = 'Grupo → FLOW INSANO!') {
    const safeNames = Array.isArray(names) ? names : [];
    let text = `*⸺͟͞𝙼𝙰𝚁𝙲𝙰𝙽𝙳𝙾 𝚃𝙾𝙳𝙾𝚂 𝙾𝚂 𝙼𝙴𝙼𝙱𝚁𝙾𝚂 𝙳𝙾 𝙶𝚁𝚄𝙿𝙾◍᳝࣪.⋕𖥾ᤢ*\n\n*🔥 ${customMessage} 🔥*\n\n╔══════════════════════╗\n`;
    text += safeNames.map(name => `║ ⊹ 𖤐 @${name}`).join('\n');
    text += `\n╚══════════════════════╝`;
    return text;
}

async function sendTagAllInChunks(sock, from, participants, message) {
    const mentionTargets = participants.filter(Boolean);
    const batches = chunkParticipants(mentionTargets, 10);

    for (const batch of batches) {
        try {
            const names = batch.map(member => String(member).split('@')[0]);
            await sock.sendMessage(from, {
                text: buildTagAllText(names, message),
                mentions: batch
            });
        } catch (error) {
            const errorMessage = String(error?.message || error || '');
            if (errorMessage.includes('rate-overlimit') || errorMessage.includes('429') || errorMessage.includes('quota')) {
                const smallerBatches = chunkParticipants(batch, 5);
                for (const smallerBatch of smallerBatches) {
                    const smallerNames = smallerBatch.map(member => String(member).split('@')[0]);
                    await sock.sendMessage(from, {
                        text: buildTagAllText(smallerNames, message),
                        mentions: smallerBatch
                    });
                }
            } else {
                throw error;
            }
        }
    }
}

module.exports = {
    definition: {
        function: {
            name: "marcar_todos",
            description: "Menciona todos os participantes do grupo em uma mensagem.",
            parameters: {
                type: "object",
                properties: {
                    mensagem: {
                        type: "string",
                        description: "A mensagem que acompanhará a marcação (ex: 'Atenção pessoal!')"
                    }
                }
            }
        }
    },
    async execute(args, { sock, from, message, isOwner, isGroupAdmins }) {
        if (!from.endsWith('@g.us')) return "Este comando só funciona em grupos.";

        if (!isOwner && !isGroupAdmins) {
            return "❌ Só administrador do grupo ou o dono pode usar o comando de marcar todos! Fica pianinho aí, plebeu! 💀";
        }

        try {
            const metadata = await sock.groupMetadata(from);
            const participants = metadata.participants.map(p => p.id);

            console.log(chalk.cyan(`[📢 TAGALL] Marcando todos em ${from}`));
            await sendTagAllInChunks(sock, from, participants, args?.mensagem || 'Grupo → FLOW INSANO!');
            return "";
        } catch (e) {
            return `Erro ao marcar todos: ${e.message}`;
        }
    }
};

module.exports.chunkParticipants = chunkParticipants;
