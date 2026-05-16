const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning, ...args) {
    if (typeof warning === 'string' && warning.includes('NODE_TLS_REJECT_UNAUTHORIZED')) return;
    if (warning && warning.name === 'Warning' && warning.message && warning.message.includes('NODE_TLS_REJECT_UNAUTHORIZED')) return;
    return originalEmitWarning.call(process, warning, ...args);
};
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Silenciar mensagens de erro internas do Baileys (decrypt/session)
const _origConsoleError = console.error;
const _origConsoleWarn = console.warn;
const silencedPatterns = [
    'Failed to decrypt',
    'MessageCounterError',
    'Key used already or never filled',
    'decryptWithSessions',
    'doDecryptWhisperMessage',
    'session_cipher',
    'queue_job',
];
function shouldSilence(args) {
    const text = args.map(a => (typeof a === 'string' ? a : (a?.stack || a?.message || String(a)))).join(' ');
    return silencedPatterns.some(p => text.includes(p));
}
console.error = function(...args) {
    if (shouldSilence(args)) return;
    _origConsoleError.apply(console, args);
};
console.warn = function(...args) {
    if (shouldSilence(args)) return;
    _origConsoleWarn.apply(console, args);
};
const {
	makeWASocket,
	fetchLatestBaileysVersion,
	DisconnectReason,
	useMultiFileAuthState,
	makeCacheableSignalKeyStore,
	proto,
} = require("@whiskeysockets/baileys");
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const gamesController = require('./skills/games_controller');

// Cache para Anti-Delete e Ranking
const messageCache = new Map();
const rankingPath = path.join(__dirname, 'skills', 'database_ranking.json');

if (!fs.existsSync('./key.json')) {
	fs.writeFileSync('./key.json', JSON.stringify({ keyopenai: "gsk_SUA_CHAVE_AQUI" }, null, 2));
}

const Pino = require("pino");
const chalk = require("chalk");
const moment = require("moment-timezone");
const readline = require("readline");
moment.tz.setDefault("America/Bahia").locale("pt-br");
const { Messages } = require("./lib/messages.js");

const question = (text) => {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	return new Promise((resolve) => {
		rl.question(text, (answer) => {
			rl.close();
			resolve(answer);
		});
	});
};

const logger = Pino({ level: "silent" });

const msgCache = new Map();
const store = {
	bind(ev) {
		ev.on("messages.upsert", ({ messages }) => {
			for (const msg of messages) {
				if (msg.key?.remoteJid && msg.key?.id) {
					msgCache.set(`${msg.key.remoteJid}:${msg.key.id}`, msg);
				}
			}
		});
	},
	async loadMessage(jid, id) {
		return msgCache.get(`${jid}:${id}`) || null;
	}
};

const color = (text, color) => {
  return !color ? chalk.green(text) : chalk.keyword(color)(text);
};

// Caminho ABSOLUTO da sessão (evita problema de diretório)
const SESSION_DIR = path.join(__dirname, "bochecha_sessao");

// IDs de mensagens enviadas pelo bot
const sentMessageIds = new Set();

async function startBot() {
	const hasSession = fs.existsSync(SESSION_DIR) && fs.readdirSync(SESSION_DIR).length > 0;

	const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
	const { version } = await fetchLatestBaileysVersion();

	let useQRCode = false;
	if (!state.creds.registered) {
		console.log(chalk.cyan('\n======================================='));
		console.log(chalk.cyan('   COMO DESEJA CONECTAR O Bochecha?'));
		console.log(chalk.cyan('======================================='));
		console.log(chalk.white(' [1] - QR Code (Escanear com a câmera)'));
		console.log(chalk.white(' [2] - Código de Pareamento (Número)'));
		console.log(chalk.cyan('======================================='));
		const opcao = await question(chalk.yellow('Digite 1 ou 2: '));
		if (opcao.trim() === '1') {
			useQRCode = true;
			console.log(chalk.green('Aguarde a geração do QR Code...'));
		} else {
			console.log(chalk.green('Iniciando pareamento por código...'));
		}
	}

	const sock = makeWASocket({
		version,
		logger,
		printQRInTerminal: useQRCode,
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, logger),
		},
		generateHighQualityLinkPreview: true,
		getMessage: async (key) => {
			const msg = await store.loadMessage(key.remoteJid, key.id);
			return msg?.message || undefined;
		}
	});

	// Interceptar sendMessage para rastrear IDs
	const _origSend = sock.sendMessage.bind(sock);
	sock.sendMessage = async (jid, message, options) => {
		const res = await _origSend(jid, message, options);
		if (res?.key?.id) {
			sentMessageIds.add(res.key.id);
			setTimeout(() => sentMessageIds.delete(res.key.id), 60000);
		}
		return res;
	};

    // Função para copiar e encaminhar mensagens (Necessário para Anti-Delete)
    sock.copyNForward = async (jid, message, forceForward = false, options = {}) => {
        let vtype;
        if (options.readViewOnce) {
            message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined);
            vtype = Object.keys(message.message.viewOnceMessage.message)[0];
            delete (message.message && message.message.viewOnceMessage ? message.message.viewOnceMessage : message.message || undefined).viewOnceMessage;
            message.message = {
                ...message.message.viewOnceMessage.message
            };
        }

        let mtype = Object.keys(message.message)[0];
        let content = await generateWAMessageFromContent(jid, message.message, { userJid: sock.user.id, ...options });
        let ctype = getContentType(content.message);
        if (forceForward && typeof content.message[ctype] === 'object' && 'contextInfo' in content.message[ctype]) content.message[ctype].contextInfo.isForwarded = true;
        if (options.contextInfo) content.message[ctype].contextInfo = { ...content.message[ctype].contextInfo, ...options.contextInfo };
        
        await sock.relayMessage(jid, content.message, { messageId: content.key.id });
        return content;
    };

	// Se não tiver credenciais registradas, pedir código de pareamento se a opção 2 foi escolhida
	if (!sock.authState.creds.registered && !useQRCode) {
		setTimeout(async () => {
			const phoneNumber = await question(chalk.yellow('\nDigite o número do WhatsApp com DDI (ex: 557199999999): '));
			if (phoneNumber && phoneNumber.trim().length > 5) {
				try {
					const code = await sock.requestPairingCode(phoneNumber.trim());
					console.log(chalk.bgGreen.black(`\n CÓDIGO DE PAREAMENTO: ${code} \n`));
					console.log(chalk.white('Insira este código no seu WhatsApp em: Aparelhos Conectados > Conectar com número de telefone.'));
				} catch (e) {
					console.error(chalk.red('\nErro ao solicitar código de pareamento. Verifique se o número está correto.'), e);
				}
			} else {
				console.log(chalk.red('\nNúmero inválido. Reinicie o bot e tente novamente.'));
			}
		}, 3000);
	}

	store?.bind(sock.ev);
	require("./lib/reminders.js").start(sock);

	sock.ev.on('creds.update', saveCreds);

	// Atualização de conexão
	sock.ev.on('connection.update', async (update) => {
		const { connection, lastDisconnect } = update;

		if (connection === 'close') {
			const lastStatus = lastDisconnect?.error?.output?.statusCode ?? lastDisconnect?.error?.status;
			const isLoggedOut = lastStatus === DisconnectReason.loggedOut;
			const shouldReconnect = !isLoggedOut;

			if (shouldReconnect) {
				const delay = lastStatus === 515 ? 1000 : 3000;
				setTimeout(() => startBot(), delay);
			} else {
				setTimeout(() => {
					try { fs.rmSync(SESSION_DIR, { recursive: true, force: true }); } catch {}
					startBot();
				}, 3000);
			}
		}

		if (connection === 'open') {
			console.log(color("✅ Bot conectado com sucesso!", "green"));
		}
	});

	// Novas mensagens
	sock.ev.on('messages.upsert', async ({ messages, type }) => {
		if (type !== 'notify') return;

		for (const msg of messages) {
			if (msg.key.remoteJid === 'status@broadcast') continue;

			if (msg.key.fromMe) {
				if (msg.key.id && sentMessageIds.has(msg.key.id)) continue;
			}

			const from = msg.key.remoteJid;
			const isGroup = from.endsWith('@g.us');
			const sender = msg.key.participant || msg.key.remoteJid;
			const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

			// 🕹️ SENSOR DE JOGOS LOCAIS (ECONOMIA DE API)
			if (isGroup && !msg.key.fromMe) {
				const isGameMove = await gamesController.processMove(sock, from, sender, body);
				if (isGameMove) continue; // Se foi uma jogada, não manda para a IA
			}

			// 🧠 SISTEMA DE CACHE E RANKING (XP)
			if (isGroup && !msg.key.fromMe) {
				// 1. Salva no Cache para Anti-Delete (Expira em 1 hora)
				messageCache.set(msg.key.id, msg);
				setTimeout(() => messageCache.delete(msg.key.id), 3600000);

				// 2. Conta XP para Ranking
				const rankingDb = fs.existsSync(rankingPath) ? JSON.parse(fs.readFileSync(rankingPath)) : {};
				if (!rankingDb[from]) rankingDb[from] = {};
				if (!rankingDb[from][sender]) rankingDb[from][sender] = { xp: 0, level: 1, name: msg.pushName || "Membro" };
				
				rankingDb[from][sender].xp += 1;
				// Sobe de nível a cada 50 mensagens
				const newLevel = Math.floor(rankingDb[from][sender].xp / 50) + 1;
				if (newLevel > rankingDb[from][sender].level) {
					rankingDb[from][sender].level = newLevel;
					await sock.sendMessage(from, { text: `🆙 *LEVEL UP!* @${sender.split('@')[0]} subiu para o nível *${newLevel}*! 🎉`, mentions: [sender] });
				}
				fs.writeFileSync(rankingPath, JSON.stringify(rankingDb, null, 2));
			}
			
			// 🛡️ SISTEMA ANTI-LINK, ANTI-FLOOD, ANTI-SPAM
			if (isGroup && !msg.key.fromMe) {
				const dbPath = path.join(__dirname, 'skills', 'database_security.json');
				if (fs.existsSync(dbPath)) {
					const securityDb = JSON.parse(fs.readFileSync(dbPath));
					
					// 1. ANTI-LINK
					if (securityDb[from]?.antilink) {
						const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
						const linkRegex = /chat\.whatsapp\.com\/[a-zA-Z0-9]*/i;
						if (linkRegex.test(body) && !isOwner) {
							await sock.sendMessage(from, { delete: msg.key });
							await sock.sendMessage(from, { text: `🚫 *ANTI-LINK* 🚫\n\n@${sender}, links não são permitidos.`, mentions: [sender + "@s.whatsapp.net"] });
							try { await sock.groupParticipantsUpdate(from, [sender + "@s.whatsapp.net"], 'remove'); } catch(e) {}
							continue;
						}
					}

                    // 2. ANTI-SPAM / FLOOD (Simples)
                    if (securityDb[from]?.antispam) {
                        // Lógica de spam pode ser adicionada aqui
                    }
				}
			}

			// ═══════════════════════════════
			// SISTEMA ANTI-PORNOGRAFIA
			// ═══════════════════════════════
			if (msg.message && (msg.message.imageMessage || msg.message.videoMessage) && msg.key.remoteJid.endsWith('@g.us') && !msg.key.fromMe) {
				const dbPath = path.join(__dirname, 'skills', 'database_security.json');
				if (fs.existsSync(dbPath)) {
					const securityDb = JSON.parse(fs.readFileSync(dbPath));
					if (securityDb[msg.key.remoteJid]?.antiporn) {
						try {
							const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
							const axios = require('axios');
							const FormData = require('form-data');
							
							const mediaType = msg.message.imageMessage ? 'image' : 'video';
							const stream = await downloadContentFromMessage(msg.message[mediaType + 'Message'], mediaType);
							let buffer = Buffer.from([]);
							for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
							
							const form = new FormData();
							form.append('image', buffer, { filename: 'scan.jpg' });
							
							const res = await axios.post('https://demo.api4ai.cloud/nsfw/v1/results', form, {
								headers: form.getHeaders(),
								timeout: 8000
							});
							
							const entity = res?.data?.results?.[0]?.entities?.find(e => e.name === 'nsfw-classes' || e.name === 'nsfw' || e.classes);
							if (entity && entity.classes) {
								const nsfwScore = entity.classes.nsfw || 0;
								if (nsfwScore > 0.6) {
									await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });
									await sock.sendMessage(msg.key.remoteJid, { text: `🚨 *SISTEMA ANTI-PORN* 🚨\n\nConteúdo impróprio detectado (Índice NSFW: ${(nsfwScore*100).toFixed(0)}%).\n\nA mensagem foi bloqueada e o usuário que enviou a foto foi removido do grupo por medida de segurança.` });
									try {
										await sock.groupParticipantsUpdate(msg.key.remoteJid, [msg.key.participant], 'remove');
									} catch(e) {}
									continue; // Interrompe o loop aqui, a imagem nem chega na Inteligência Artificial
								}
							}
						} catch (err) {
							console.error("Erro no scanner Anti-Porn:", err.message);
						}
					}
				}
			}

			// ═══════════════════════════════
			// SISTEMA ANTI-STATUS E ANTI-PAGAMENTO
			// ═══════════════════════════════
			if (msg.message && msg.key.remoteJid.endsWith('@g.us') && !msg.key.fromMe) {
				const dbPath = path.join(__dirname, 'skills', 'database_security.json');
				if (fs.existsSync(dbPath)) {
					const securityDb = JSON.parse(fs.readFileSync(dbPath));
					if (securityDb[msg.key.remoteJid]?.antistatus || securityDb[msg.key.remoteJid]?.antipagamento) {
						
						const msgKeys = Object.keys(msg.message);
						const isStatusMsg = msgKeys.includes('groupStatusMentionMessage') || 
											msgKeys.includes('groupStatusMessageV2');
						
						// Desembrulha viewOnce se houver, pra achar pagamentos escondidos
						const realMsg = msg.message.viewOnceMessageV2?.message || msg.message.viewOnceMessage?.message || msg.message;
						const realKeys = Object.keys(realMsg);
						const isPaymentMsg = realKeys.includes('requestPaymentMessage') || realKeys.includes('sendPaymentMessage');
											
						if ((securityDb[msg.key.remoteJid]?.antistatus && isStatusMsg) || 
							(securityDb[msg.key.remoteJid]?.antipagamento && isPaymentMsg)) {
							try {
								await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });
							} catch (e) {}
							continue;
						}
					}
				}

				// 🎙️ REAÇÕES AUTOMÁTICAS POR ÁUDIO (IGUAL AO CORVO)
				const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
				const lowBody = body.toLowerCase();
				const audioReactions = {
					"bom dia": "bomdia.mp3",
					"boa noite": "boanoite.mp3",
					"boa tarde": "boatarde.mp3",
					"kkk": "risada.mp3",
					"hahaha": "risada.mp3",
					"safado": "safado.mp3",
					"corvo": "corvo.mp3",
					"bochecha": "menu.mp3"
				};

				for (const [key, file] of Object.entries(audioReactions)) {
					if (lowBody.includes(key)) {
						const audioPath = path.join(__dirname, 'lib', file);
						if (fs.existsSync(audioPath)) {
							await sock.sendMessage(from, { 
								audio: fs.readFileSync(audioPath), 
								mimetype: 'audio/mp4', 
								ptt: true 
							}, { quoted: msg });
						}
						break; 
					}
				}

				// 🗣️ RESPOSTAS AUTOMÁTICAS (ENSINADAS)
				const autoReplyPath = path.join(__dirname, 'skills', 'database_autoreply.json');
				if (fs.existsSync(autoReplyPath)) {
					const autoReplyDb = JSON.parse(fs.readFileSync(autoReplyPath));
					if (autoReplyDb[from]) {
						const gatilho = lowBody.trim();
						if (autoReplyDb[from][gatilho]) {
							await sock.sendMessage(from, { text: autoReplyDb[from][gatilho] }, { quoted: msg });
							// Não para o processamento, para que a IA ainda possa responder se for um comando
						}
					}
				}
			}

			const message = Messages({ messages: [msg], type }, sock);
			if (!message) continue;
			require("./sansekai.js")({ messages: [msg], type }, sock, store, message);
		}
	});

	// ═══════════════════════════════
	//  SISTEMA DE BOAS-VINDAS (Welcome)
	// ═══════════════════════════════
	sock.ev.on('group-participants.update', async (anu) => {
		try {
			const from = anu.id;
			const metadata = await sock.groupMetadata(from);
			const dbPath = path.join(__dirname, 'skills', 'database_security.json');
			const securityDb = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath)) : {};

			// 🛡️ SISTEMA ANTI-PROMOTE / ANTI-DEMOTE
			if (anu.action === 'promote' || anu.action === 'demote') {
                const author = anu.author;
                const owners = ["556584770585", "176291932332072"];
                const isOwner = owners.some(num => author?.includes(num)) || author === sock.user.id.split(':')[0] + '@s.whatsapp.net';
                
                if (isOwner) return; // Se a ação foi feita pelo dono ou pelo bot, permite.

				if (securityDb[from]?.antipromote && anu.action === 'promote') {
					await sock.groupParticipantsUpdate(from, anu.participants, 'demote');
					await sock.sendMessage(from, { text: `🛡️ *SISTEMA ANTI-PROMOTE* 🛡️\n\nAção de promoção detectada e revertida automaticamente.` });
					return;
				}
				if (securityDb[from]?.antidemote && anu.action === 'demote') {
					await sock.groupParticipantsUpdate(from, anu.participants, 'promote');
					await sock.sendMessage(from, { text: `🛡️ *SISTEMA ANTI-DEMOTE* 🛡️\n\nAção de rebaixamento detectada e revertida automaticamente.` });
					return;
				}
			}

			// 🚪 SAÍDA DO GRUPO
			if (anu.action === 'remove') {
				const num = anu.participants[0];
				if (securityDb[from]?.bemvindo) {
					let text = `┏━━━━━━━━━━━━━━━━━━━━━┓\n┃   💀  *𝐒𝐀𝐈𝐔 𝐃𝐎 𝐆𝐑𝐔𝐏𝐎*  💀\n┗━━━━━━━━━━━━━━━━━━━━━┛\n\n⚡ *EX-MEMBRO:* @${num.split("@")[0]}\n\n┎┅┅┅┅━═⋅═━━━━═⋅═━┅┅┅┅☾⋆\n┖╮*Já vai tarde, vacilão!* 🖕\n╰╼╼╼╼╼╍⋅⊹⋅⋅⦁ 💀 ⦁⋅⋅⊹⋅╍╾╾╾╾☾⋆`;
					await sock.sendMessage(from, { text: text, mentions: [num] });
				}
			}

			// 🤝 ENTRADA NO GRUPO
			if (anu.action === 'add') {
				// 🛡️ SISTEMA ANTI-FAKE / ANTI-GRINGO
				if (securityDb[from]?.antifake) {
					for (let user of anu.participants) {
						if (!user.startsWith('55')) {
							await sock.sendMessage(from, { text: `🚫 *SISTEMA ANTI-FAKE* 🚫\n\nO número @${user.split('@')[0]} foi identificado como estrangeiro/fake e removido.`, mentions: [user] });
							await sock.groupParticipantsUpdate(from, [user], 'remove');
							return;
						}
					}
				}

				if (securityDb[from]?.bemvindo) {
					for (let user of anu.participants) {
                        const modelo = securityDb[from].modelo_bv || 1;
                        const legenda1 = securityDb[from].legenda_bv1 || `┏━━━━━━━━━━━━━━━━━━━━━┓\n┃   🛸  *𝐁𝐄𝐌-𝐕𝐈𝐍𝐃𝐎(𝐀)*  🛸\n┗━━━━━━━━━━━━━━━━━━━━━┛\n\n⚡ *USUÁRIO:* @${user.split("@")[0]}\n⚡ *GRUPO:* ${metadata.subject}\n\n┎┅┅┅┅━═⋅═━━━━═⋅═━┅┅┅┅☾⋆\n┖╮*Seja bem-vindo(a) ao ninho!*\n┇ Leia as regras para não ser banido!\n╰╼╼╼╼╼╍⋅⊹⋅⋅⦁ ⚡ ⦁⋅⋅⊹⋅╍╾╾╾╾☾⋆`;
                        const legenda2 = securityDb[from].legenda_bv2 || `👋 Olá @${user.split("@")[0]}, bem-vindo ao grupo ${metadata.subject}!`;

                        if (modelo === 1) {
                            // BV1: Foto + Texto
                            const welcomeImage = "https://files.catbox.moe/t7w3gk.jpg"; // Imagem padrão
                            await sock.sendMessage(from, { 
                                image: { url: welcomeImage }, 
                                caption: legenda1.replace('@user', `@${user.split('@')[0]}`),
                                mentions: [user] 
                            });
                        } else {
                            // BV2: Só Texto
                            await sock.sendMessage(from, { 
                                text: legenda2.replace('@user', `@${user.split('@')[0]}`), 
                                mentions: [user] 
                            });
                        }
					}
				}
			}
		} catch (e) {
			console.error("Erro no Welcome:", e.message);
		}
	});

	// 👁️ SISTEMA ANTI-DELETE (REVELAR MENSAGENS APAGADAS)
	sock.ev.on('messages.update', async (chatUpdate) => {
		for (const { key, update } of chatUpdate) {
			if (update.messageStubType === 28 || update.messageStubType === 29) continue; // Ignorar mensagens de sistema
			
			if (update.protocolMessage && update.protocolMessage.type === 0) { // Tipo 0 é mensagem deletada
				const msgId = update.protocolMessage.key.id;
				const from = key.remoteJid;
				
				if (!from.endsWith('@g.us')) continue; // Só funciona em grupos
				
				const dbPath = path.join(__dirname, 'skills', 'database_security.json');
				if (fs.existsSync(dbPath)) {
					const securityDb = JSON.parse(fs.readFileSync(dbPath));
					if (!securityDb[from]?.antidelete) continue;
					
					const originalMsg = messageCache.get(msgId);
					if (!originalMsg) continue;
					
					const sender = originalMsg.key.participant || originalMsg.key.remoteJid;
					const moment = require('moment-timezone');
					const time = moment(originalMsg.messageTimestamp * 1000).format('HH:mm:ss');
					
					let footer = `\n\n🕒 *Enviada em:* ${time}\n👤 *Autor:* @${sender.split('@')[0]}`;
					
					await sock.sendMessage(from, { text: `🚨 *ANTI-DELETE DETECTADO* 🚨\n\nUma mensagem foi apagada!` });
					
					// Reenvia a mensagem apagada
					await sock.copyNForward(from, originalMsg, false, { contextInfo: { mentionedJid: [sender] } });
				}
			}
		}
	});

    // 🌙 SISTEMA DE MODO NOTURNO AUTOMÁTICO (CRON)
    setInterval(async () => {
        const noturnoPath = path.join(__dirname, 'skills', 'database_noturno.json');
        if (!fs.existsSync(noturnoPath)) return;
        
        const db = JSON.parse(fs.readFileSync(noturnoPath));
        const agora = moment().tz('America/Sao_Paulo').format('HH:mm');
        
        for (const [from, config] of Object.entries(db)) {
            try {
                if (agora === config.fechar && config.lastAction !== 'fechado') {
                    await sock.groupSettingUpdate(from, 'announcement');
                    await sock.sendMessage(from, { text: "🌙 *MODO NOTURNO ATIVADO!* O grupo foi fechado automaticamente. Bom sono a todos! 😴🔒" });
                    db[from].lastAction = 'fechado';
                    fs.writeFileSync(noturnoPath, JSON.stringify(db, null, 2));
                } else if (agora === config.abrir && config.lastAction !== 'aberto') {
                    await sock.groupSettingUpdate(from, 'not_announcement');
                    await sock.sendMessage(from, { text: "☀️ *MODO NOTURNO ENCERRADO!* O grupo foi aberto automaticamente. Bom dia! 🔓✨" });
                    db[from].lastAction = 'aberto';
                    fs.writeFileSync(noturnoPath, JSON.stringify(db, null, 2));
                }
            } catch (e) {
                console.error(`Erro no modo noturno do grupo ${from}:`, e.message);
            }
        }
    }, 60000); // Checa a cada 1 minuto
}

process.on('uncaughtException', (error) => {
	console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (error) => {
	console.error('❌ Promise rejeitada:', error);
});

process.on('SIGINT', () => {
	process.exit(0);
});

const banner = `
╔══════════════════════╗
║    𝐁𝐎𝐂𝐇𝐄𝐂𝐇𝐀  -  𝐈𝐀    ║
╚══════════════════════╝
  🚀 Inicializando...
`;

console.clear();
console.log(chalk.cyan(banner));
require("./sansekai.js"); // Pré-carrega as skills agora, depois de limpar a tela

startBot().catch(error => {
	console.error('❌ Erro ao iniciar bot:', error);
	process.exit(1);
});
