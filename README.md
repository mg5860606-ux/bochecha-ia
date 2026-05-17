<div align="center">
  <img src="https://files.catbox.moe/t7w3gk.jpg" width="200" alt="Bochecha Logo" style="border-radius: 50%;">
  <h1>𝐁𝐎𝐂𝐇𝐄𝐂𝐇𝐀 - 𝐈𝐀 🛸</h1>
  <p><b>Motor de Inteligência Artificial e Administração Autônoma de Última Geração para WhatsApp.</b></p>

  <p>
    <a href="#"><img src="https://img.shields.io/badge/Vers%C3%A3o-3.5.0%20Premium-blue?style=for-the-badge&logo=appveyor" alt="Version"></a>
    <a href="#"><img src="https://img.shields.io/badge/WhatsApp-Baileys-success?style=for-the-badge&logo=whatsapp" alt="Baileys"></a>
    <a href="#"><img src="https://img.shields.io/badge/Google-Gemini_AI-orange?style=for-the-badge&logo=google" alt="Gemini"></a>
  </p>
</div>

<br>

O **Bochecha-IA** não é apenas um bot; é um **Sistema Autônomo Baseado em Agente (Agentic AI)**. Utilizando o poder multimodal do **Google Gemini** em conjunto com a **Spider API** de alta performance, o Bochecha consegue gerenciar grupos, tomar decisões, baixar mídias, realizar pesquisas e entreter os usuários de forma independente, simulando uma interação perfeitamente humana.

---

## 🌟 Recursos de Elite

### 🧠 Inteligência Artificial Autônoma (Tool Calling)
O cérebro do bot é alimentado pelo Gemini e consegue usar "Ferramentas" (*Skills*) sozinho. Se você pedir *"Bochecha, baixa aquele vídeo ali"*, ele entende o contexto visual, encontra a ferramenta de download e executa a ação sem precisar de comandos engessados com barra `/`.
* **Visão e Audição:** Ele lê imagens, assiste vídeos, ouve áudios enviados no WhatsApp e lê arquivos PDF/TXT.
* **Mente Dinâmica:** O `SystemPromptComposer` altera a personalidade do bot dependendo de quem fala com ele. (Trata o Criador como "Soberano", Admins com reverência, e usuários comuns com sarcasmo).
* **Indicador de Status Humano:** A IA emite a presença "Digitando..." no topo da tela do WhatsApp enquanto está pensando.

### 🕸️ Spider API Engine (Mídias e Utilitários)
Integrado de ponta a ponta com as rotas premium da Spider API para processamento instantâneo:
* **Download Universal:** Baixa sem marca d'água do `TikTok`, `Instagram (Reels)`, `Facebook`, `Pinterest`, e extrai MP4/MP3 do `YouTube`.
* **YouTube Search:** Busca nativa no YouTube retornando Títulos, Views, Duração e Thumbnails.
* **Canvas Manipulator:** Puxa dinamicamente a Foto de Perfil do usuário no WhatsApp e aplica filtros Cômicos (`/jail`, `/rip`, `/bolsonaro`, `/invert`, `/goodbye`).
* **Gerador de Figurinhas de Texto (ATTP):** Cria figurinhas de texto piscantes e animadas em WebP de forma nativa.
* **RemoveBG:** Remove fundos de imagens usando IA.

### 🛡️ Escudo de Segurança (Defesa Absoluta)
* **Anti-Link & Anti-Porn (NSFW):** Expurga membros que enviam links ou conteúdos +18 (usando visão computacional).
* **Anti-Delete & Anti-ViewOnce:** Intercepta mídias de "Visualização Única" e mensagens apagadas e joga no chat.
* **Anti-Fake/Gringo:** Bloqueia números de DDI estrangeiros automaticamente.

### 💰 RPG & Economia Integrada
* Sistema bancário completo com `Bochecha-Coins`.
* **Mineração:** Ganhe moedas através do comando `/minerar`.
* **Mercado & Transferências:** Pix (`/pix`), roleta russa, duelo e ranking global de quem é mais rico no grupo.

---

## 💻 Comandos Manuais (Menu)
Apesar de possuir autonomia neural, os administradores podem invocar módulos através de comandos clássicos:

| Categoria | Comandos Disponíveis |
| :--- | :--- |
| **Downloads** | `/play`, `/video`, `/tiktok`, `/insta`, `/facebook`, `/pinterest`, `/ytsearch` |
| **Pesquisas** | `/clima`, `/google`, `/wiki`, `/cpf`, `/cnpj`, `/placa`, `/cep`, `/ip` |
| **Criatividade & IA** | `/gerar`, `/gpt`, `/anime`, `/efeitos`, `/removebg`, `/revelar` |
| **Figurinhas** | `/s`, `/fstiker`, `/attp`, `/rename` |
| **Administração** | `/ban`, `/promover`, `/rebaixar`, `/warn`, `/mutar`, `/desmutar`, `/apagar`, `/todos`, `/bv` |
| **Economia** | `/saldo`, `/minerar`, `/pix`, `/duelo`, `/ricos`, `/blackjack` |
| **Zoeira & RPG** | `/velha`, `/forca`, `/roleta`, `/enquete`, `/jokenpo`, `/matar`, `/casais`, `/gay`, `/gado`, `/namorar`, etc... |

---

## ⚙️ Tecnologias de Infraestrutura

* **Node.js** com execução assíncrona focada em alta performance.
* **Baileys (WebSockets)** para comunicação não-oficial e bypass com os servidores do WhatsApp.
* **Arquitetura SOA (Service-Oriented)** modular. Se uma *skill* quebrar, o núcleo do bot nunca para de rodar.
* **Rotação de Chaves de API:** Sistema `keyRotator.js` inteligente para contornar Rate Limits (`HTTP 429`) da API do Google, garantindo 100% de Uptime.

---

## 🛠️ Como Iniciar o Motor

1. **Clone e Instale:**
   ```bash
   git clone https://github.com/mg5860606-ux/bochecha-ia.git
   cd bochecha-ia
   npm install
   ```

2. **Configure suas Chaves (API):**
   Execute o bot a primeira vez e conecte via QR Code. Em seguida, adicione suas chaves do Gemini via comando no PV do bot:
   ```text
   /addkey SUA_CHAVE_AQUI
   ```

3. **Inicie o Servidor:**
   ```bash
   npm start
   ```

---

<div align="center">
  <i>"A evolução não é uma opção, é um protocolo."</i><br>
  <b>Criado e projetado pelo Desenvolvedor Marcos.</b>
</div>