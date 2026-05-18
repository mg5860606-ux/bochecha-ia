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
const qrcode = require('qrcode-terminal');
const gamesController = require('./skills/games_controller');

let globalSock = null;
let isHealing = false;

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

let globalUseQRCode = null; // Memoriza a escolha para evitar perguntar de novo na reconexão
let consecutiveFailures = 0;

async function startBot() {
	const hasSession = fs.existsSync(SESSION_DIR) && fs.readdirSync(SESSION_DIR).length > 0;

	const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
	const { version } = await fetchLatestBaileysVersion();

	let useQRCode = false;
	if (!state.creds.registered) {
		if (globalUseQRCode === null) {
			console.log(chalk.cyan('\n======================================='));
			console.log(chalk.cyan('   COMO DESEJA CONECTAR O Bochecha?'));
			console.log(chalk.cyan('======================================='));
			console.log(chalk.white(' [1] - QR Code (Escanear com a câmera)'));
			console.log(chalk.white(' [2] - Código de Pareamento (Número)'));
			console.log(chalk.cyan('======================================='));
			
			const isServer = !process.stdin.isTTY || process.env.PTERODACTYL || process.env.SERVER || process.env.DOCKER_ENV;
			if (isServer) {
				console.log(chalk.green('Hospedagem/Servidor detectado. Escolhendo [1] - QR Code automaticamente...'));
				globalUseQRCode = true;
			} else {
				// Interface interativa com timeout de 8 segundos para garantir
				const responsePromise = question(chalk.yellow('Digite 1 ou 2 (Padrão 1 em 8s): '));
				const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('1'), 8000));
				const opcao = await Promise.race([responsePromise, timeoutPromise]);
				
				if (opcao.trim() === '2') {
					globalUseQRCode = false;
					console.log(chalk.green('Iniciando pareamento por código...'));
				} else {
					globalUseQRCode = true;
					console.log(chalk.green('Aguarde a geração do QR Code...'));
				}
			}
		}
		useQRCode = globalUseQRCode;
	}

	const sock = makeWASocket({
		version,
		logger,
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, logger),
		},
		browser: ['Bochecha-IA', 'Chrome', '110.0.0.0'],
		syncFullHistory: false,
		markOnlineOnConnect: true,
		generateHighQualityLinkPreview: true,
		getMessage: async (key) => {
			const msg = await store.loadMessage(key.remoteJid, key.id);
			return msg?.message || undefined;
		}
	});

	globalSock = sock;

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
		// Apenas pede o número se for a primeira vez na sessão
		if (!global.telefonePedido) {
			global.telefonePedido = true;
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
	}

	store?.bind(sock.ev);
	require("./lib/reminders.js").start(sock);

	sock.ev.on('creds.update', saveCreds);

	// Atualização de conexão
	sock.ev.on('connection.update', async (update) => {
		const { connection, lastDisconnect, qr } = update;

		if (qr && !hasSession) {
			consecutiveFailures = 0; // Se gerou QR Code, reseta falha de conexão porque o canal está saudável!
			console.log(chalk.cyan('\n=================================================='));
			console.log(chalk.cyan('   ESCANEIE O QR CODE ABAIXO COM O WHATSAPP:'));
			console.log(chalk.cyan('==================================================\n'));
			qrcode.generate(qr, { small: true });
		}

		if (connection === 'close') {
			consecutiveFailures++;
			const lastStatus = lastDisconnect?.error?.output?.statusCode ?? lastDisconnect?.error?.status;
			console.log(chalk.yellow(`[🔌 Conexão Fechada] Status: ${lastStatus} (Tentativa consecutiva: ${consecutiveFailures})`));
			
			// Se o usuário ainda não conectou (não registrado), qualquer fechamento de conexão exige reiniciar
			// a pasta de sessão para evitar o loop de status 428. Exceto se for um status temporário (como 515 restartRequired
			// ou 408 timeout/lost), onde devemos manter os arquivos para prosseguir com o login em andamento!
			const isRegistered = sock.authState?.creds?.registered;
			const isTemporary = lastStatus === 515 || lastStatus === 408 || lastStatus === 503;
			const isLoggedOut = lastStatus === DisconnectReason.loggedOut || lastStatus === 401 || (!isRegistered && !isTemporary);
			const shouldReconnect = !isLoggedOut;

			if (shouldReconnect) {
				const delay = Math.min(3000 * consecutiveFailures, 15000);
				console.log(chalk.gray(`Falha de conexão temporária. Mantendo a sessão intacta. Tentando reconectar em ${delay/1000}s...`));
				setTimeout(() => startBot(), delay);
			} else {
				consecutiveFailures = 0; // reseta
				console.log(chalk.red(`Sessão desconectada ou desvinculada no celular (Status ${lastStatus}). Limpando credenciais antigas...`));
				setTimeout(() => {
					try { fs.rmSync(SESSION_DIR, { recursive: true, force: true }); } catch {}
					startBot();
				}, 3000);
			}
		}

		if (connection === 'open') {
			consecutiveFailures = 0; // Reseta no sucesso
			console.log(chalk.green("✅ Bot conectado com sucesso!"));
			// Aciona a vinculação de eventos avançados do motor Bochecha-IA
			require("./sansekai.js").bind(sock, store);
		}
	});
}

async function autoHeal(error) {
    if (isHealing) return;
    isHealing = true;

    console.log(chalk.red('[Self-Healing] Iniciando diagnóstico de travamento automático...'));

    try {
        const stackLines = error.stack ? error.stack.split('\n') : [];
        let targetFile = null;
        let errorLine = null;

        for (const line of stackLines) {
            if (line.includes('.js') && !line.includes('node_modules') && !line.includes('internal/')) {
                const match = line.match(/([\w\-\\._:]+\.js):(\d+):(\d+)/) || line.match(/\(([^)]+):(\d+):(\d+)\)/);
                if (match) {
                    targetFile = match[1];
                    errorLine = match[2];
                    break;
                }
            }
        }

        if (!targetFile) {
            console.log(chalk.yellow('[Self-Healing] Não foi possível determinar o arquivo de origem do crash na stack trace.'));
            return;
        }

        const absolutePath = path.isAbsolute(targetFile) ? targetFile : path.join(__dirname, targetFile);
        if (!fs.existsSync(absolutePath)) {
            console.log(chalk.yellow(`[Self-Healing] Arquivo não localizado no disco: ${absolutePath}`));
            return;
        }

        console.log(chalk.yellow(`[Self-Healing] Arquivo que quebrou detectado: ${absolutePath} (linha ${errorLine})`));

        // Carrega chave de API via rotador
        const apiKeyManager = require('./apiKeyManager');
        const keys = apiKeyManager.listKeys();
        if (keys.length === 0) {
            console.log(chalk.red('[Self-Healing] Nenhuma chave de API disponível para auto-cura.'));
            return;
        }

        const fileContent = fs.readFileSync(absolutePath, 'utf8');

        const systemInstruction = "Você é um Engenheiro de Software Sênior especialista em JavaScript e NodeJS. Sua única tarefa é ler o código fornecido, analisar o erro que causou o crash do servidor e reescrever o código do arquivo para corrigir o bug de forma limpa e estável. Retorne EXCLUSIVAMENTE o código JS completo e corrigido, sem explicações, sem formatações markdown do tipo ```javascript ... ```. Apenas o código-fonte puro.";
        
        const prompt = `[CRITICAL REPAIR TASK]
O processo NodeJS crashou com o seguinte erro:
${error.stack || error.message}

Arquivo causador: ${absolutePath} (Linha ${errorLine})

Aqui está o código completo atual do arquivo:
\`\`\`javascript
${fileContent}
\`\`\``;

        console.log(chalk.cyan('[Self-Healing] Acionando neurônios neurais via OpenRouter para reparo dinâmico...'));

        const axios = require('axios');
        let correctedCode = "";
        let success = false;
        
        const healModels = [
            "google/gemini-2.5-pro:free",
            "anthropic/claude-3.7-sonnet",
            "openai/o3-mini",
            "google/gemini-2.5-pro",
            "anthropic/claude-3.5-sonnet"
        ];

        for (const key of keys) {
            if (success) break;
            for (const model of healModels) {
                try {
                    console.log(chalk.yellow(`[Self-Healing] Tentando curar com modelo ${model} usando chave ${key.substring(0, 8)}...`));
                    const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
                        model: model,
                        messages: [
                            { role: "system", content: systemInstruction },
                            { role: "user", content: prompt }
                        ]
                    }, {
                        headers: {
                            "Authorization": `Bearer ${key}`,
                            "Content-Type": "application/json"
                        },
                        timeout: 30000
                    });

                    correctedCode = res.data?.choices?.[0]?.message?.content?.trim();
                    if (correctedCode && correctedCode.length > 50) {
                        success = true;
                        console.log(chalk.green(`[Self-Healing] Auto-cura bem sucedida via ${model}!`));
                        break;
                    }
                } catch (e) {
                    console.log(chalk.red(`[Self-Healing] Falha ao curar com ${model}: ${e.message}`));
                }
            }
        }

        if (!success || !correctedCode) {
            throw new Error("O Bochecha esgotou todas as chaves e modelos SOTA e não conseguiu efetuar o auto-reparo do código.");
        }

        if (correctedCode.startsWith("```")) {
            correctedCode = correctedCode.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
        }

        fs.writeFileSync(absolutePath, correctedCode, 'utf8');
        console.log(chalk.green(`[Self-Healing] Arquivo ${path.basename(absolutePath)} reparado com sucesso!`));

        if (globalSock) {
            const owners = ["556584770585@s.whatsapp.net", "176291932332072@s.whatsapp.net"];
            for (const owner of owners) {
                try {
                    await globalSock.sendMessage(owner, {
                        text: `🛡️ *SISTEMA SELF-HEALING ATIVADO* 🛡️\n\n` +
                              `⚠️ *Ocorreu um Crash Grave no Servidor!*\n` +
                              `📁 *Arquivo:* \`${path.basename(absolutePath)}\` (linha ${errorLine})\n` +
                              `❌ *Erro:* \`${error.message}\`\n\n` +
                              `🔮 *Ação do Bochecha:* Analisei os logs, chamei as conexões neurais do submundo, **corrigi o bug automaticamente** e gravei o arquivo!\n\n` +
                              `🔄 *Status:* Reiniciando o bot em background agora com o código saudável! 🥀💀⚡`
                    });
                } catch (msgErr) {
                    console.error('[Self-Healing] Erro ao enviar mensagem de alerta:', msgErr.message);
                }
            }
        }

        console.log(chalk.cyan('[Self-Healing] Iniciando reinicialização autônoma do processo Bochecha...'));
        const { spawn } = require('child_process');
        setTimeout(() => {
            const child = spawn(process.argv[0], process.argv.slice(1), {
                detached: true,
                stdio: 'inherit'
            });
            child.unref();
            process.exit(0);
        }, 1500);

    } catch (healErr) {
        console.error(chalk.red('[Self-Healing] Falha no sistema de auto-cura:', healErr.message));
        process.exit(1);
    }
}

process.on('uncaughtException', (error) => {
	console.error('❌ Erro não capturado:', error);
	autoHeal(error);
});

process.on('unhandledRejection', (error) => {
	console.error('❌ Promise rejeitada:', error);
	autoHeal(error instanceof Error ? error : new Error(String(error)));
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
