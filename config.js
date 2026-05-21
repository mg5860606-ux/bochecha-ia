/**
 * ╔═══════════════════════════════════════════════════╗
 * ║       BOCHECHA-IA — CONFIGURAÇÃO CENTRAL          ║
 * ║  Edite APENAS aqui para mudar donos, APIs e bot.  ║
 * ╚═══════════════════════════════════════════════════╝
 *
 * Este é o único arquivo que você precisa editar para configurar o Bochecha.
 * Todas as skills e módulos leem daqui automaticamente.
 */

// ─────────────────────────────────────────────
//  👑 DONOS DO BOT
//  Números sem "@s.whatsapp.net", sem "+" e sem traços.
//  Para adicionar um dono novo, só colocar o número aqui.
// ─────────────────────────────────────────────
const OWNER_NUMBERS = [
    "559491855060",   // Davy (número do proprietário atual)
    "551420370026",   // Marcos (criador do bot)
    "169497243697274", // Marcos (conta Business LID / Mano B)
];

// ─────────────────────────────────────────────
//  🤖 CONFIGURAÇÕES DO BOT
// ─────────────────────────────────────────────
const BOT_CONFIG = {
    name: "𝐁𝐎𝐂𝐇𝐄𝐂𝐇𝐀",          // Nome do bot exibido no menu
    prefix: "/",                     // Prefixo dos comandos
    owner: "𝐌𝐀𝐑𝐂𝐎𝐒 亗",           // Nome do dono exibido no menu
    panelPort: 4061,                 // Porta do painel web (Alinhada com a Bronxys Host)
    timezone: "America/Bahia",       // Timezone padrão
    menuVideoUrl: "https://files.catbox.moe/mcnawn.mp4", // Vídeo do menu principal
};

// ─────────────────────────────────────────────
//  🔑 APIS EXTERNAS
//  As chaves do OpenRouter ficam em key.json (gerenciadas pelo apiKeyManager).
//  Aqui ficam as configurações das outras APIs usadas pelas skills.
// ─────────────────────────────────────────────
const API_CONFIG = {
    // API de detecção de NSFW (pornografia)
    nsfw: {
        url: "https://nsfw6.p.rapidapi.com/",
        host: "nsfw6.p.rapidapi.com",
        key: "1b3dea2a91mshb9fe879fbdd3decp19b2c7jsnc4f9a49b6dc3", // Chave RapidAPI NSFW
    },

    // API de clima
    weather: {
        key: "SUA_CHAVE_OPENWEATHER_AQUI", // Substitua pela chave do OpenWeatherMap
        url: "https://api.openweathermap.org/data/2.5/weather",
    },

    // API de geração de imagem (poluinations.ai - gratuita, sem chave necessária)
    imageGen: {
        url: "https://image.pollinations.ai/prompt/",
    },

    // GitHub API (para as skills de github_explorer, release_generator, etc.)
    github: {
        token: "", // Opcional: coloque um token GitHub para requests autenticados (mais rate limit)
    },
};

// ─────────────────────────────────────────────
//  🔧 FUNÇÕES UTILITÁRIAS
// ─────────────────────────────────────────────

// Sincronização em nuvem via Firebase (Desative para manter o bot 100% privado e local)
const USE_FIREBASE = false;

/**
 * Verifica se um JID ou número pertence a um dono do bot.
 * @param {string} jidOrNumber  JID completo ou número limpo.
 * @returns {boolean}
 */
function isOwnerNumber(jidOrNumber) {
    if (!jidOrNumber) return false;
    const clean = jidOrNumber.replace(/[^0-9]/g, '');
    return OWNER_NUMBERS.some(num => clean.includes(num) || num.includes(clean));
}

module.exports = { OWNER_NUMBERS, BOT_CONFIG, API_CONFIG, isOwnerNumber, USE_FIREBASE };
