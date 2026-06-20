const fs = require('fs');
const path = require('path');
const { BOT_CONFIG, OWNER_NUMBERS, isOwnerNumber } = require('../config');

const _k = 'BochechaSupremeKey2026';
function _d(hex) {
    const bytes = hex.match(/.{1,2}/g).map((h, i) => parseInt(h, 16) ^ _k.charCodeAt(i % _k.length));
    return Buffer.from(bytes).toString('utf8');
}

const CATEGORY_NAMES = {
    elite: { title: "👑 𝐒𝐔𝐏𝐄𝐑-𝐇𝐀𝐁𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒 𝐄𝐋𝐈𝐓𝐄 𝟐𝟎𝟐𝟔", icon: "🔥" },
    dev: { title: "💻 𝐏𝐀𝐈𝐍𝐄𝐋 𝐃𝐎 𝐃𝐄𝐒𝐄𝐍𝐕𝐎𝐋𝐕𝐄𝐃𝐎𝐑 (𝐃𝐎𝐍𝐎)", icon: "⚙️", ownerOnly: true },
    info: { title: "♰ 𝐈𝐍𝐅𝐎𝐒 & 𝐒𝐓𝐀𝐓𝐔𝐒", icon: "♱" },
    ia: { title: "♰ 𝐈𝐍𝐓𝐄𝐋𝐈𝐆𝐄̂𝐍𝐂𝐈𝐀 𝐀𝐑𝐓𝐈𝐅𝐈𝐂𝐈𝐀𝐋", icon: "✨" },
    media: { title: "♰ 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑𝐒 & 𝐌𝐈́𝐃𝐈𝐀", icon: "🎥" },
    stickers: { title: "♰ 𝐅𝐈𝐆𝐔𝐑𝐈𝐍𝐇𝐀𝐒", icon: "🎭" },
    data: { title: "♰ 𝐏𝐄𝐒𝑄𝐔𝐈𝐒𝐀𝐒 & 𝐃𝐀𝐃𝐎𝐒", icon: "🎲" },
    admin: { title: "♰ 𝐀𝐃𝐌𝐈𝐍𝐈𝐒𝐓𝐑𝐀𝐂̧𝐀̃𝐎", icon: "🛡️" },
    security: { title: "♰ 𝐒𝐄𝐆𝐔𝐑𝐀𝐍𝐂̧𝐀 & 𝐓𝐑𝐀𝐕𝐀𝐒", icon: "🛡️" },
    economy: { title: "♰ 𝐄𝐂𝐎𝐍𝐎𝐌𝐈𝐀 𝐄 𝐂𝐀𝐒𝐒𝐈𝐍 O", icon: "💰" },
    games: { title: "♰ 𝐉𝐎𝐆𝐎𝐒 & 𝐙𝐎𝐄𝐈𝐑𝐀", icon: "🕹" },
    astro: { title: "♰ 𝐀𝐒𝐓𝐑𝐎𝐋𝐎𝐆𝐈𝐀 & 𝐌𝐔𝐍𝐃𝐎", icon: "🔮" },
    tools: { title: "♰ 𝐅𝐄𝐑𝐑𝐀𝐌𝐄𝐍𝐓𝐀𝐒 & 𝐔́𝐓𝐄𝐈𝐒", icon: "🔧" },
    other: { title: "🛸 𝐎𝐔𝐓𝐑𝐀𝐒 𝐅𝐄𝐑𝐑𝐀𝐌𝐄𝐍𝐓𝐀𝐒", icon: "👾" }
};

const SKILL_CATEGORIES = {
    eval: "dev", run_terminal: "dev", terminal: "dev", controle_pc: "dev", pc_file_manager: "dev",
    read_system_file: "dev", write_system_file: "dev", list_system_directory: "dev",
    search_system_files: "dev", send_file_to_whatsapp: "dev", download_from_internet: "dev",
    pc_webcam: "dev", pc_speedtest: "dev", limpar_keys: "dev", reload: "dev", reiniciar: "dev",
    dream: "dev", refletir: "dev", git_manager: "dev", github_explorer: "dev", github_ai_hunter: "dev",
    release_generator: "dev", issue_operator: "dev", manage_system_directory: "dev",
    
    editor_universal: "elite", bochecha_voz: "elite", devaneios: "elite", radar_membros: "elite",
    bochecha_modo: "elite", detector_ko: "elite", analise_grupo: "elite", casar: "elite",
    divorciar: "elite", tribunal: "elite", executar_codigo_sandbox: "elite", namoro: "elite",
    chamar_no_pv: "elite", melhorar_grupo: "elite", analista_psicologico: "elite",
    enviar_mensagem_privada: "elite",
    
    ping: "info", status_sistema: "info", infogp: "info", exibir_ranking: "info",
    perfil: "info", total_comandos: "info", mostrar_atividade_atual: "info", exibir_menu: "info",
    listar_minhas_ferramentas: "info",
    
    gpt: "ia", gerar_imagem_ia: "ia", gerador_efeitos: "ia", detetive_fake_news: "ia",
    transformar_foto_ia: "ia", auto_resposta: "ia", gerenciar_ias: "ia",
    
    baixar_videos: "media", baixar_adulto: "media", pesquisar_youtube: "media",
    falar_em_audio: "media", revelar: "media", resumir_fofoca: "media", play_audio: "media",
    
    fazer_figurinha: "stickers", fazer_figurinha_de_texto: "stickers",
    renomear_figurinha: "stickers", arte_figurinha: "stickers",
    
    consultar_clima: "data", google: "data", wiki: "data", consultar_dados: "data",
    consultar_pv: "data", cep: "data", ip: "data", web_reader: "data", noticias_boas: "data",
    
    remover_membro: "admin", adicionar_membro: "admin", promover_membro: "admin",
    rebaixar_membro: "admin", advertir_membro: "admin", remover_advertencia: "admin",
    mutar_grupo: "admin", desmutar_grupo: "admin", apagar_mensagem: "admin",
    apagar_especial: "admin", marcar_todos: "admin", configurar_bv: "admin",
    configurar_grupo: "admin", modo_noturno: "admin", postar_status: "admin",
    configurar_menu: "admin", definir_vip: "admin", gerenciar_admin: "admin",
    gerenciar_grupo: "admin", gerenciar_info_grupo: "admin",
    
    configurar_seguranca: "security", antilink: "security", antiporn: "security",
    antidelete: "security", antifake: "security", antistatus: "security",
    antipromote: "security", antidemote: "security", antipagamento: "security",
    antiflood: "security", bemvindo: "security",
    
    saldo: "economy", minerar: "economy", pix: "economy", duelo: "economy",
    blackjack: "economy", cassino: "economy", ricos: "economy", loja_submundo: "economy",
    sistema_economia: "economy",
    
    gerador_memes: "games", confessionario: "games", jogo_da_velha: "games",
    jogo_forca: "games", roleta_russa: "games", quiz: "games", jokenpo: "games",
    enquete: "games", namorar: "games", separar: "games", casais: "games",
    dado_rpg: "games", piada: "games", fato_curioso: "games", desafio: "games",
    moeda: "games", enquete_rapida: "games", brincadeiras: "games", velha: "games",
    verdade_desafio: "games", criar_enquete: "games", games_controller: "games",
    jogar_moeda: "games", rolar_dados: "games",
    
    horoscopo: "astro", signo: "astro", hora_mundial: "astro",
    
    calcular: "tools", sorteio: "tools", tradutor: "tools", texto_tools: "tools",
    base64: "tools", cor_hex: "tools", adicionar_lembrete: "tools",
    agendar_lembrete: "tools", lembrar_fato: "tools", memoria_permanente: "tools",
    avisos: "tools", contagem_regressiva: "tools", placar: "tools", votacao: "tools",
    ferramentas_internet: "tools"
};

const SKILL_SHORT_DESCRIPTIONS = {
    ping: "Testa latência",
    status_sistema: "Status do sistema",
    infogp: "Informações do grupo",
    exibir_ranking: "Exibe ranking de XP",
    perfil: "Sua carteira, level e XPs",
    total_comandos: "Total de comandos",
    mostrar_atividade_atual: "Atividade recente",
    exibir_menu: "Exibe este menu",
    listar_minhas_ferramentas: "Lista ferramentas instaladas",
    gpt: "Falar com a IA",
    gerar_imagem_ia: "Gera imagem por IA",
    gerador_efeitos: "Efeitos na imagem por IA",
    detetive_fake_news: "Detetive de links e fake news",
    gerenciar_ias: "Configura os modelos de IA",
    baixar_videos: "Baixa de YouTube/TikTok/Reels",
    baixar_adulto: "Busca de vídeos adultos",
    pesquisar_youtube: "Busca vídeos no YouTube",
    falar_em_audio: "Texto para voz realista",
    revelar: "Revela visualização única",
    resumir_fofoca: "Resumo de IA das interações",
    play_audio: "Baixa áudio/música",
    fazer_figurinha: "Cria figurinha de imagem",
    fazer_figurinha_de_texto: "Figurinha de texto animada",
    renomear_figurinha: "Renomeia figurinha",
    arte_figurinha: "Efeitos de stickers",
    consultar_clima: "Consulta o clima",
    google: "Busca no Google",
    wiki: "Busca na Wikipédia",
    consultar_dados: "Consulta CPF/CNPJ/Placa",
    consultar_pv: "Consulta dados privados",
    web_reader: "Extrai conteúdo de links web",
    noticias_boas: "Busca notícias positivas de hoje",
    remover_membro: "Remove membro (ban)",
    adicionar_membro: "Adiciona membro",
    promover_membro: "Promove a admin",
    rebaixar_membro: "Rebaixa de admin",
    advertir_membro: "Adverte membro",
    remover_advertencia: "Remove advertência",
    mutar_grupo: "Muta o grupo",
    desmutar_grupo: "Desmuta o grupo",
    apagar_mensagem: "Apaga mensagens",
    apagar_especial: "Apaga mensagens de outros",
    marcar_todos: "Marca todos os membros",
    configurar_bv: "Configura boas-vindas",
    configurar_grupo: "Configura permissões",
    modo_noturno: "Modo noturno automático",
    postar_status: "Posta status no bot",
    configurar_menu: "Configura estilo do menu",
    definir_vip: "Define/remove membro VIP",
    gerenciar_admin: "Promove/rebaixa admin",
    gerenciar_grupo: "Gerencia configurações do grupo",
    gerenciar_info_grupo: "Configura foto e dados do grupo",
    configurar_seguranca: "Configura travas",
    antilink: "Muta links",
    antiporn: "Muta pornografia",
    antidelete: "Reenvia apagadas",
    antifake: "Muta gringos",
    antistatus: "Muta status",
    antipromote: "Segurança de admin",
    antidemote: "Segurança de admin",
    antipagamento: "Muta pagamentos",
    antiflood: "Muta flood",
    bemvindo: "Muta boas-vindas",
    saldo: "Ver Bochecha-Coins",
    minerar: "Minera moedas",
    pix: "Transfere moedas",
    duelo: "Duelo de moedas",
    blackjack: "Jogo de cartas",
    cassino: "Jogo de cassino",
    ricos: "Mais ricos do grupo",
    loja_submundo: "Loja do submundo",
    sistema_economia: "Economia global",
    gerador_memes: "Cria meme com foto",
    confessionario: "Segredo anônimo no PV",
    jogo_da_velha: "Jogo da velha",
    jogo_forca: "Jogo da forca",
    roleta_russa: "Roleta russa",
    quiz: "Quiz interativo",
    jokenpo: "Pedra, papel, tesoura",
    enquete: "Cria enquetes",
    namorar: "Propõe namoro",
    separar: "Termina namoro",
    casais: "Forma casais",
    dado_rpg: "Dado RPG",
    piada: "Conta piadas",
    fato_curioso: "Conta fatos",
    desafio: "Desafios zueiros",
    moeda: "Cara ou coroa",
    enquete_rapida: "Enquete rápida",
    brincadeiras: "Brincadeiras diversas",
    criar_enquete: "Cria enquete no chat",
    games_controller: "Gerencia status dos jogos",
    jogar_moeda: "Joga cara ou coroa rápido",
    rolar_dados: "Rola dados numéricos",
    horoscopo: "Ver horóscopo do dia",
    signo: "Ver signo",
    hora_mundial: "Ver hora no mundo",
    calcular: "Calculadora avançada",
    sorteio: "Realiza sorteio",
    tradutor: "Traduz textos",
    texto_tools: "Modifica textos",
    base64: "Codifica/Decodifica",
    cor_hex: "Cores hexadecimais",
    adicionar_lembrete: "Cria lembretes",
    agendar_lembrete: "Agenda lembretes",
    lembrar_fato: "Fatos importantes",
    memoria_permanente: "Gerencia fatos",
    avisos: "Gerencia avisos",
    contagem_regressiva: "Contagem regressiva",
    placar: "Ver placar de XP",
    votacao: "Inicia votações",
    ferramentas_internet: "Utilitários de rede e web",
    eval: "Executa JavaScript",
    run_terminal: "Executa comando no terminal",
    terminal: "Executa no terminal",
    controle_pc: "Hardware, RAM, CPU & processos",
    pc_file_manager: "Gerenciador de arquivos",
    read_system_file: "Lê arquivo do PC",
    write_system_file: "Cria arquivo no PC",
    list_system_directory: "Lista diretório do PC",
    search_system_files: "Busca arquivos",
    send_file_to_whatsapp: "Envia arquivo do PC",
    download_from_internet: "Baixa arquivo no PC",
    pc_webcam: "Captura foto webcam",
    pc_speedtest: "Testa velocidade do PC",
    git_manager: "Gerencia Git do bot",
    github_explorer: "Busca repositórios",
    github_ai_hunter: "Busca repositórios IA",
    release_generator: "Gera changelog",
    issue_operator: "Gerencia issues dev",
    manage_system_directory: "Gerencia pastas do PC",
    editor_universal: "Edita fotos, vídeos e PDFs",
    bochecha_voz: "Modulador de voz",
    devaneios: "Sonhos subconscientes",
    radar_membros: "Radar geográfico",
    bochecha_modo: "Muda personalidade",
    detector_ko: "Detector de mentiras",
    analise_grupo: "Laudo psicológico",
    casar: "Casamento e separação",
    divorciar: "Divórcio litigioso",
    tribunal: "Júri popular e ban",
    executar_codigo_sandbox: "Executa JS em Sandbox",
    namoro: "Namoro",
    velha: "Jogo da velha",
    verdade_desafio: "Verdade ou desafio",
    chamar_no_pv: "Chama membro no PV e avisa",
    melhorar_grupo: "Gera foto do grupo com IA",
    analista_psicologico: "Análise de perfil psicológico",
    enviar_mensagem_privada: "Envia mensagem no PV de alguém"
};

module.exports = {
    definition: {
        function: {
            name: "exibir_menu",
            description: "Exibe o Menu Principal com todas as ferramentas instaladas.",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, { sock, from, message }) {
        try {
            const prefix = BOT_CONFIG.prefix;
            const NomeDoBot = BOT_CONFIG.name;
            const DonoName = BOT_CONFIG.owner;
            const owners = OWNER_NUMBERS;

            const sender = message.key.participant || message.key.remoteJid;
            const isOwner = isOwnerNumber(sender);

            let isGroupAdmins = false;
            if (from.endsWith('@g.us')) {
                const groupMetadata = await sock.groupMetadata(from);
                const participants = groupMetadata.participants;
                const admins = participants.filter(p => p.admin !== null).map(p => p.id);
                isGroupAdmins = admins.includes(sender);
            }

            const uptime = process.uptime();
            const dias = Math.floor(uptime / 86400);
            const horas = Math.floor((uptime % 86400) / 3600);
            const minutos = Math.floor((uptime % 3600) / 60);
            const uptimeStr = `${String(dias).padStart(2, '0')}d ${String(horas).padStart(2, '0')}h ${String(minutos).padStart(2, '0')}m`;

            const speed = (Date.now() - (message.messageTimestamp * 1000)) / 1000;

            // Carrega dinamicamente todas as skills
            const skillsDir = __dirname;
            const files = fs.readdirSync(skillsDir);
            const skillsList = [];

            for (const file of files) {
                if (file.endsWith(".js") && file !== "games_controller.js") {
                    try {
                        const skillPath = path.join(skillsDir, file);
                        const skill = require(skillPath);
                        if (skill.definition && skill.definition.function) {
                            const fn = skill.definition.function;
                            skillsList.push({
                                name: fn.name,
                                description: fn.description || ""
                            });
                        }
                    } catch (err) {
                        // Silencioso
                    }
                }
            }

            // Agrupa por categoria
            const groups = {};
            for (const catKey in CATEGORY_NAMES) {
                groups[catKey] = [];
            }

            for (const s of skillsList) {
                const cat = SKILL_CATEGORIES[s.name] || "other";
                groups[cat].push(s);
            }

            // Constrói o texto das categorias do menu
            let categoriesText = "";
            for (const catKey in CATEGORY_NAMES) {
                const catInfo = CATEGORY_NAMES[catKey];
                
                if (catInfo.ownerOnly && !isOwner) {
                    continue;
                }

                const skillsInCat = groups[catKey];
                if (skillsInCat.length === 0) continue;

                // Ordena alfabeticamente
                skillsInCat.sort((a, b) => a.name.localeCompare(b.name));

                categoriesText += `\n┇ |\n┇ | ${catInfo.title}\n`;
                for (const s of skillsInCat) {
                    categoriesText += `┇ |${catInfo.icon}⋆͜͡҈➳ ${prefix}${s.name}\n`;
                }
            }

            // Adiciona a Habilidade especial Autoprogramada create_custom_skill no painel do dev
            if (isOwner) {
                categoriesText = categoriesText.replace(
                    `\n┇ |\n┇ | ${CATEGORY_NAMES.dev.title}\n`,
                    `\n┇ |\n┇ | ${CATEGORY_NAMES.dev.title}\n┇ |⚙️⋆͜͡҈➳ ${prefix}create_custom_skill\n`
                );
            }

            // Menu principal com cabeçalho e rodapé
            const menuText = `╭⊱ ───── ⋆⋅ ♰ ⋅⋆ ───── ⊰˖°🥀ִ ࣪𖤐
├─ ⊹ 𖤐 𝐈𝐍𝐅𝐎𝐒 𝐃𝐎 𝐁𝐎𝐓 / 𝐔𝐒𝐄𝐑
╎🥀˖ ▸ 𝗨𝘀𝘂́𝗮𝗿𝗶𝗼: @${sender.split('@')[0]}
╎🥀˖ ▸ 𝗩𝗜𝗣: ${isOwner ? "Sim ✅" : "Não ❌"}
╎🥀˖ ▸ 𝗖𝗮𝗿𝗴𝗼: ${isGroupAdmins ? "Admin" : "Membro"}
╎🥀˖ ▸ 𝗗𝗼𝗻𝗼: ${DonoName}
╎🥀˖ ▸ 𝗕𝗼𝘁: ${NomeDoBot}
╎🥀˖ ▸ 𝗣𝗿𝗲𝗳𝗶𝘅𝗼: ${prefix}
╎🥀˖ ▸ 𝗩𝗲𝗹𝗼𝗰𝗶𝗱𝗮𝗱𝗲: ${speed.toFixed(3)}s
╎🥀˖ ▸ 𝗨𝗽𝘁𝗶𝗺𝗲: ${uptimeStr}
├⊱ ───── ⋆⋅ ♰ ⋅⋆ ───── ⊰˖°🥀ִ ࣪𖤐
▹▫◃
  ⚔️ *Repositório Oficial:* ${_d("2a1b17181659474e341c041a100f4b280a141d5d55037a59535e555545142b5a121d060500280d181f5953")}
▹▫◃
┎┶┅┅┅━═⋅═━━━━═⋅═━┅┅┅┅☾⋆
┖╮
╭┤ˑ࣪    ִ .̇  ۫  ̣ ֽ֗🛸 𝐌𝐄𝐍𝐔 𝐃𝐎 𝐁𝐎𝐂𝐇𝐄𝐂𝐇𝐀-𝐈𝐀 🛸·๋  ִ֗  ᐧ ֶּ֓ ˑ࣪ 
┇├┉━┅━┅━┅━┅━┅━┅━⋅≎⋆ᐧ
┇ | ${categoriesText}┇ |
┇ | 🤖 *𝐇𝐀𝐁𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒 𝐀𝐔𝐓𝐎̂𝐍𝐎𝐌𝐀𝐒 𝐃𝐀 𝐈𝐀*
┇ | _Fale naturalmente com o Bochecha:_
┇ |🗣️⋆͜͡҈➳ Áudios: Mande áudios ou peça pra ele falar
┇ |🗣️⋆͜͡҈➳ Mídia: "Faz figurinha", "Gera imagem", "Edita foto"
┇ |🗣️⋆͜͡҈➳ Admin: "Bane o @", "Averte", "Promove"
┇ |🗣️⋆͜͡҈➳ PV: "Manda mensagem no PV dizendo..."
┇ |🗣️⋆͜͡҈➳ Busca: "Pesquisa no YouTube", "Baixa o vídeo"
┇ |🗣️⋆͜͡҈➳ Lembretes: "Me lembra em 10 min de..."
┇ |🗣️⋆͜͡҈➳ Status: "Posta isso no seu status"
┇ |
┇ ╰┉━┅━┅━┅━┅━┅━┅━⋅≎⋆ᐧ
  _${NomeDoBot} Power by ${DonoName}_
   _*Original Repo:* ${_d("2a1b17181659474e341c041a100f4b280a141d5d55037a59535e555545142b5a121d060500280d181f5953")}_
 ╰╼╼╼╼╼╍⋅⊹⋅⋅⦁ ⚡ ⦁⋅⋅⊹⋅╍╾╾╾╾☾⋆`;

            await sock.sendMessage(from, {
                video: { url: BOT_CONFIG.menuVideoUrl },
                caption: menuText,
                gifPlayback: true,
                mentions: [sender]
            });

            return "O Menu foi exibido.";
        } catch (e) {
            return `Erro ao exibir o menu: ${e.message}`;
        }
    }
};
