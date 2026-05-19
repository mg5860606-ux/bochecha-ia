<div align="center">
  <img src="bochecha.jpg" width="350" alt="Bochecha Logo" style="border-radius: 24px; box-shadow: 0 10px 40px rgba(0, 242, 254, 0.5); border: 3px solid #00f2fe;">
  <br><br>
  <h1>🛸 𝐁𝐎𝐂𝐇𝐄𝐂𝐇𝐀 - 𝐈𝐀 𝐯𝟓.𝟎 𝐒𝐔𝐏𝐑𝐄𝐌𝐀 🛸</h1>
  <p><b>O Único e Mais Poderoso Sistema Autônomo Baseado em Agente (Agentic AI) com Persistência Híbrida e Inteligência de Elite SOTA.</b></p>

  <p>
    <a href="#"><img src="https://img.shields.io/badge/Vers%C3%A3o-5.0.0_SOTA_Premium-00f2fe?style=for-the-badge&logo=appveyor" alt="Version"></a>
    <a href="#"><img src="https://img.shields.io/badge/Database-Cloud_Firestore-FFCA28?style=for-the-badge&logo=firebase" alt="Firestore"></a>
    <a href="#"><img src="https://img.shields.io/badge/Seguran%C3%A7a-Firestore_Shield-red?style=for-the-badge&logo=shield" alt="Firestore Shield"></a>
    <a href="#"><img src="https://img.shields.io/badge/WhatsApp-Baileys_WS-success?style=for-the-badge&logo=whatsapp" alt="Baileys"></a>
  </p>
</div>

---

O **Bochecha-IA v5.0** representa o ápice absoluto da engenharia de agentes inteligentes aplicados ao WhatsApp. Muito além de um bot de respostas lineares, o Bochecha é um **organismo cognitivo autônomo**.

Alimentado pelos modelos de linguagem de maior prestígio do planeta (*Claude 3.7 Sonnet, OpenAI o3-mini, Claude 3.5 Sonnet e Gemini 2.5 Pro*), o Bochecha opera com persistência híbrida avançada (Local Lock + Cloud Firestore), autogestão de VPS, telemetria em tempo real e um sistema de moderação de grupos implacável.

---

## ⚡ Novos Recursos de Elite (v5.0 SOTA)

### 🛡️ 1. Escudo de Segurança do Grupo com Firestore (Group Security Shield)
Toda a segurança dos grupos foi unificada e integrada ao `StorageManager` central para garantir gravação thread-safe e espelhamento em tempo real no Cloud Firestore (Coleção `database_json`):
* **Filtro Anti-Pornografia (NSFW Cloud API):** Ao detectar imagens ou vídeos de membros comuns com o filtro ativo, o Bochecha faz download do fluxo de bytes da mídia, analisa-a via visão computacional na API do `api4ai` e, se a probabilidade de nudez/pornografia for superior a **60% (Score 0.6)**, deleta a mídia, expulsa o infrator imediatamente e envia uma telemetria detalhada para os administradores.
* **Filtro Anti-Link:** Bloqueia e pune instantaneamente qualquer envio de convite de grupos do WhatsApp (`chat.whatsapp.com/`). A mensagem é excluída em milissegundos, o usuário é expulso do grupo e um alerta com os dados do infrator é disparado para a telemetria do criador.
* **Filtro Anti-Status:** Varre os cabeçalhos brutos de dados JSON das mensagens em busca de payloads invasivos de visualizações de status (`groupStatusMentionMessage` ou `groupStatusMessageV2`), deletando-os na mesma hora para evitar spams e travamento do WhatsApp.

### 🌐 2. Persistência de Alta Performance & Auto-Healing
O cérebro do Bochecha nunca dorme e nunca perde dados:
* **StorageManager Thread-Safe:** Leituras e escritas assíncronas protegidas por travas exclusivas de arquivos (`_acquireLock`), evitando corrupção de dados ao salvar pontuações, economias ou dados sensíveis.
* **Auto-Recuperação de VPS:** Ao clonar o projeto em uma nova máquina ou VPS com a pasta de dados vazia, o Bochecha se comunica com o Cloud Firestore e reconstrói localmente todos os históricos de jogos, avisos, chaves e economias.
* **Recuperação de Falhas por IA:** Caso um erro crítico não tratado ocorra no servidor, a IA analisa a stack trace, identifica a linha com o bug, **corrige o código-fonte autonomamente** e reinicia o bot em 1.5 segundos.

### 🕵️‍♂️ 3. Agente PV (Real-Time Spy)
O Bochecha possui comunicação omnicanal. Se um usuário chamá-lo em um grupo solicitando a leitura de segredos ou conversas recebidas no privado, o bot executa a skill `consultar_conversa_pv`, faz a leitura das últimas 8 mensagens do privado daquele usuário de forma autônoma e emite sua resposta debochada no grupo público!

### 🔉 4. Mixagem Imersiva de Áudio Universal (Ambient Soundscapes & iOS Support)
Os áudios gerados pelo Bochecha usam a voz premium `AntonioNeural` processada por um pipeline analógico avançado de **FFmpeg (`lavfi` + `anoisesrc` + `amix`)**, misturando um ruído rosa sutil ao fundo da fala humana, simulando de forma realista o microfone físico de um celular em um ambiente real.
* **Compatibilidade Universal (iOS/iPhone & Android):** Transcodificação em tempo real de MP3 para **MP4 fragmentado com codec AAC** (`-c:a aac -f mp4 -movflags frag_keyframe+empty_moov`), enviado com o mimetype `audio/mp4`, permitindo reprodução 100% nativa em iPhones (Apple CoreAudio) e Androids.

### ⚙️ 5. Chamada de Ferramentas Nativa no Claude 3.5 Sonnet (Native Anthropic Tool Calling)
* Mapeamento dinâmico e em tempo real de esquemas de funções Gemini para o formato nativo de ferramentas da Anthropic (`input_schema`).
* Habilita a IA Claude 3.5 Sonnet a invocar nativamente 100% das ferramentas do bot, eliminando fallbacks de blocos XML crus no chat e garantindo comandos fluidos.

### 👥 6. Menção Numérica Mandatória (`@número`)
* Diretriz de prompt injetada de forma cirúrgica na IA para que ela se refira e responda a qualquer usuário usando a menção numérica real correspondente ao seu JID.
* Nosso resolvedor converte automaticamente a string em uma **marcação oficial clicável em azul** com notificação direta ao celular da pessoa, pondo fim a qualquer tipo de confusão de nomes e identidades em grupos movimentados.

### ➕ 7. Skill de Adicionar Membros com Auto-Convite de Privacidade (`/adicionar_membro`)
* Skill autônoma carregada dinamicamente para adicionar contatos pelo número de telefone diretamente no grupo.
* **Resolução Inteligente de Privacidade:** Se a pessoa tiver privacidade ativa contra adição em grupos no zap, o Bochecha detecta o bloqueio, gera o link de convite e envia uma mensagem personalizada contendo o link de acesso diretamente no privado dela, notificando os administradores com transparência!

### 🖥️ 8. Detecção Dinâmica de Ambiente (PC do Marcos vs VPS Cloud)
* Sistema autônomo de telemetria capaz de examinar os metadados do host operacional e o usuário logado em tempo de execução.
* Identifica automaticamente se está no Computador Pessoal Local do Marcos (Ambiente de Testes) ou na VPS Cloud dedicada (Produção), permitindo que a IA saiba responder exatamente sua localização física!

### 🚨 9. Agente de Controle Remoto e Telemetria do PC (/controle_pc)
* Permite ao desenvolvedor Marcos controlar e monitorar seu PC local à distância por comandos ou conversa natural no zap.
* **Recursos de Hardware Nativo:** `/controle_pc print` (tira screenshot em tempo real do monitor e envia no WhatsApp), `bloquear` (tranca a tela do Windows instantaneamente), `status` (exibe telemetria de RAM, CPU e Uptime) e `processos` (lista os 10 processos mais pesados na CPU).

### 📊 10. Relatório de Inteligência Social e Perfis do Grupo (/analise_grupo)
* Skill avançada que varre o histórico recente de conversas do grupo e gera um diagnóstico social cômico e afiado.
* **Raio-X de Zoeira:** Traça a personalidade de cada participante ativo usando gírias cariocas, calcula a tensão do chat (0% a 100%), aponta o maior tagarela do grupo, prevê quem vai criar barraco hoje e fornece conselhos irônicos de sobrevivência!

### 🕵️‍♂️ 11. Detector de K.O. e Polígrafo de Zoeira (/detector_ko)
* Polígrafo humorístico ativado ao responder a mensagem de qualquer participante com `/detector_ko`.
* **Laudo de K.O.:** Avalia o texto respondido, gera uma porcentagem hilária de mentira, cria uma categoria pericial zoeira (ex: "Mitomania de Pescador") e emite uma sentença carioca esculachando a conversa fiada.

### 🎭 12. Modulador de Personalidade Caótica (/bochecha_modo)
* Permite mudar dinamicamente o temperamento do Bochecha nas conversas do grupo atual via `/bochecha_modo <modo>`.
* **Modos Suportados:** `cria` (carioca malandro de facção), `coach` (mindset quântico insuportável), `baiano` (preguiça extrema de rede), `agiota` (cobrando juros de Bochecha-Coins com ameaças cômicas) e `normal` (debochado equilibrado).

### 💍 13. Sistema de Matrimônio e Divórcio com Partilha de Bens (/casar | /divorciar)
* Dinâmica social onde participantes podem propor casamento formal no chat via `/casar @membro`.
* **Partilha de Bens do Agiota:** Se o amor acabar, `/divorciar` inicia o divórcio litigioso forçado com uma roleta de partilha de bens, confiscando **50% de todas as moedas de um parceiro** da database de economia (`Bochecha-Coins`) e transferindo para a carteira do outro com um termo de zoeira judicial!

### ⚖️ 14. Tribunal de Vacilões e Rifa do Ban (/tribunal)
* Sistema democrático de julgamento cômico aberto contra membros chatos via `/tribunal @vacilao motivo: <crime>`.
* **Júri Popular:** Abre uma votação pública de 45 segundos por chat no grupo (voto digitado: "culpado" ou "inocente"). Se considerado culpado pela maioria, **o Bochecha remove o réu de verdade do grupo**, enviando o link de retorno com salvo-conduto diretamente no privado dele!

### 🧠💻 15. Motor Code Interpreter e Sandbox (/eval)
* **Super-Inteligência:** Skill que fornece capacidades lógicas e matemáticas infinitas para a IA (`executar_codigo_sandbox`). Sempre que o Bochecha recebe um problema matemático ou lógico complexo, ele **escreve um minicódigo JavaScript, executa em uma máquina virtual isolada do host e retorna o resultado 100% preciso** (sem alucinações!).
* **Acesso de Proprietário (/eval):** Permite ao Arquiteto Marcos rodar qualquer código Node.js no host diretamente pelo WhatsApp de forma nativa e instantânea.

### 🛠️🎬 16. Editor Universal de Mídias e Documentos (/editar)
* **Super-Editor de Arquivos:** Permite aos usuários editarem e melhorarem qualquer arquivo simplesmente respondendo a ele (imagem, vídeo, áudio, PDF ou texto) no WhatsApp!
* **Ações Automáticas Inteligentes:**
  * **Imagens:** O bot aplica filtros gráficos complexos via Jimp (preto e branco, blur, resize) ou executa OCR automatizado com melhoria linguística de textos de imagens.
  * **Áudios e Vídeos:** O bot executa argumentos de FFmpeg estático dinamicamente no host para cortar trechos, alterar velocidades, remover áudios ou extrair MP3!
  * **Textos e PDFs:** O bot edita, traduz, resume ou formata o texto com precisão militar.

---

## 🕸️ Recursos Clássicos e Utilitários

O Bochecha conta com as integrações mais eficientes do mercado:
* **Download Universal:** Baixa sem marca d'água do `TikTok`, `Instagram (Reels)`, `Facebook`, `Pinterest`, e extrai MP4/MP3 do `YouTube`.
* **YouTube Search:** Busca nativa no YouTube retornando Títulos, Views, Duração e Thumbnails.
* **Canvas Manipulator:** Aplica filtros cômicos instantâneos à foto de perfil do usuário (`/jail`, `/rip`, `/bolsonaro`, `/invert`, `/goodbye`).
* **Figurinhas Animadas (ATTP):** Cria figurinhas de texto piscantes e animadas em WebP nativamente.
* **RemoveBG:** Remove fundos de imagens usando inteligência artificial de alta fidelidade.

---

## 💻 Painel de Comandos Manuais (Menu)

| Categoria | Comandos Disponíveis |
| :--- | :--- |
| **Downloads** | `/play`, `/video`, `/tiktok`, `/insta`, `/facebook`, `/pinterest`, `/ytsearch` |
| **Pesquisas** | `/clima`, `/google`, `/wiki`, `/cpf`, `/cnpj`, `/placa`, `/cep`, `/ip` |
| **Criatividade & IA** | `/gerar`, `/gpt`, `/anime`, `/efeitos`, `/removebg`, `/revelar` |
| **Figurinhas** | `/s`, `/fstiker`, `/attp`, `/rename` |
| **Administração** | `/configurar_seguranca`, `/ban`, `/promover`, `/rebaixar`, `/warn`, `/mutar`, `/desmutar`, `/apagar`, `/todos`, `/bv` |
| **Economia** | `/saldo`, `/minerar`, `/pix`, `/duelo`, `/ricos`, `/blackjack` |
| **Zoeira & RPG** | `/velha`, `/forca`, `/roleta`, `/enquete`, `/jokenpo`, `/matar`, `/casais`, `/gay`, `/gado`, `/namorar`, etc... |

---

## ⚙️ Tecnologias de Infraestrutura

* **Node.js** com execução assíncrona focada em alta performance.
* **Baileys (WebSockets)** para comunicação estável de baixa latência com os servidores do WhatsApp.
* **Cloud Firestore SDK** integrado nativamente para persistência elástica.
* **FFmpeg Estático** para modulação, mixagem e transcodificação de mídia com latência zero.
* **Arquitetura SOA (Service-Oriented)** modular. Se uma *skill* quebrar, o núcleo do bot nunca para de rodar.

---

## 🛠️ Como Iniciar o Motor

1. **Clone e Instale:**
   ```bash
   git clone https://github.com/mg5860606-ux/bochecha-ia.git
   cd bochecha-ia
   npm install
   ```

2. **Configure suas Credenciais Firebase:**
   O bot lê as credenciais automaticamente no arquivo `firebase_connector.js`. Cole suas chaves de API do OpenRouter e credenciais Firestore diretamente no console ou no Firestore sob a coleção `configuracoes/chaves_api`.

3. **Inicie o Servidor:**
   ```bash
   npm start
   ```

---

<div align="center">
  <i>"A evolução não é uma opção, é um protocolo."</i><br>
  <b>Criado, projetado e assinado pelo Desenvolvedor Marcos.</b>
</div>