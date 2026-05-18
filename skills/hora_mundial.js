module.exports = {
    definition: {
        function: {
            name: "hora_mundial",
            description: "Mostra a hora atual em diversas cidades e fusos horários do mundo.",
            parameters: {
                type: "object",
                properties: {
                    cidade: {
                        type: "string",
                        description: "Nome da cidade ou fuso horário (ex: 'tokyo', 'new york', 'londres')."
                    }
                }
            }
        }
    },
    async execute(args, { sock, from }) {
        const rawTexto = (args.cidade || args.texto || args.alvo || '').trim().toLowerCase();

        const fusos = {
            'brasil': { tz: 'America/Sao_Paulo', nome: '🇧🇷 Brasil (Brasília)', emoji: '🇧🇷' },
            'sao paulo': { tz: 'America/Sao_Paulo', nome: '🇧🇷 São Paulo', emoji: '🇧🇷' },
            'rio': { tz: 'America/Sao_Paulo', nome: '🇧🇷 Rio de Janeiro', emoji: '🇧🇷' },
            'manaus': { tz: 'America/Manaus', nome: '🇧🇷 Manaus', emoji: '🇧🇷' },
            'new york': { tz: 'America/New_York', nome: '🇺🇸 Nova York', emoji: '🇺🇸' },
            'nova york': { tz: 'America/New_York', nome: '🇺🇸 Nova York', emoji: '🇺🇸' },
            'los angeles': { tz: 'America/Los_Angeles', nome: '🇺🇸 Los Angeles', emoji: '🇺🇸' },
            'londres': { tz: 'Europe/London', nome: '🇬🇧 Londres', emoji: '🇬🇧' },
            'london': { tz: 'Europe/London', nome: '🇬🇧 Londres', emoji: '🇬🇧' },
            'paris': { tz: 'Europe/Paris', nome: '🇫🇷 Paris', emoji: '🇫🇷' },
            'tokyo': { tz: 'Asia/Tokyo', nome: '🇯🇵 Tóquio', emoji: '🇯🇵' },
            'toquio': { tz: 'Asia/Tokyo', nome: '🇯🇵 Tóquio', emoji: '🇯🇵' },
            'pequim': { tz: 'Asia/Shanghai', nome: '🇨🇳 Pequim', emoji: '🇨🇳' },
            'beijing': { tz: 'Asia/Shanghai', nome: '🇨🇳 Pequim', emoji: '🇨🇳' },
            'dubai': { tz: 'Asia/Dubai', nome: '🇦🇪 Dubai', emoji: '🇦🇪' },
            'moscou': { tz: 'Europe/Moscow', nome: '🇷🇺 Moscou', emoji: '🇷🇺' },
            'moscow': { tz: 'Europe/Moscow', nome: '🇷🇺 Moscou', emoji: '🇷🇺' },
            'sydney': { tz: 'Australia/Sydney', nome: '🇦🇺 Sydney', emoji: '🇦🇺' },
            'buenos aires': { tz: 'America/Argentina/Buenos_Aires', nome: '🇦🇷 Buenos Aires', emoji: '🇦🇷' },
            'mexico': { tz: 'America/Mexico_City', nome: '🇲🇽 Cidade do México', emoji: '🇲🇽' },
            'lisboa': { tz: 'Europe/Lisbon', nome: '🇵🇹 Lisboa', emoji: '🇵🇹' },
            'berlim': { tz: 'Europe/Berlin', nome: '🇩🇪 Berlim', emoji: '🇩🇪' },
            'berlin': { tz: 'Europe/Berlin', nome: '🇩🇪 Berlim', emoji: '🇩🇪' },
            'roma': { tz: 'Europe/Rome', nome: '🇮🇹 Roma', emoji: '🇮🇹' },
            'madrid': { tz: 'Europe/Madrid', nome: '🇪🇸 Madri', emoji: '🇪🇸' },
            'seul': { tz: 'Asia/Seoul', nome: '🇰🇷 Seul', emoji: '🇰🇷' },
            'seoul': { tz: 'Asia/Seoul', nome: '🇰🇷 Seul', emoji: '🇰🇷' },
            'mumbai': { tz: 'Asia/Kolkata', nome: '🇮🇳 Mumbai', emoji: '🇮🇳' },
            'cairo': { tz: 'Africa/Cairo', nome: '🇪🇬 Cairo', emoji: '🇪🇬' },
            'toronto': { tz: 'America/Toronto', nome: '🇨🇦 Toronto', emoji: '🇨🇦' },
            'miami': { tz: 'America/New_York', nome: '🇺🇸 Miami', emoji: '🇺🇸' },
            'chicago': { tz: 'America/Chicago', nome: '🇺🇸 Chicago', emoji: '🇺🇸' },
            'santiago': { tz: 'America/Santiago', nome: '🇨🇱 Santiago', emoji: '🇨🇱' },
            'bogota': { tz: 'America/Bogota', nome: '🇨🇴 Bogotá', emoji: '🇨🇴' },
            'lima': { tz: 'America/Lima', nome: '🇵🇪 Lima', emoji: '🇵🇪' }
        };

        if (!rawTexto) {
            // Mostra hora de várias cidades principais
            const principais = ['brasil', 'new york', 'londres', 'tokyo', 'dubai', 'sydney'];
            let text = `🌍 *HORA MUNDIAL* 🌍\n\n`;
            for (const key of principais) {
                const info = fusos[key];
                const hora = getHoraFormatada(info.tz);
                text += `${info.emoji} *${info.nome}:* ${hora}\n`;
            }
            text += `\n_diga /hora <cidade> para ver uma específica._\n_cidades: ${Object.keys(fusos).slice(0, 15).join(', ')}... 💀_`;
            return text;
        }

        // Busca cidade
        const info = fusos[rawTexto];
        if (!info) {
            // Busca parcial
            const chave = Object.keys(fusos).find(k => k.includes(rawTexto));
            if (chave) {
                const infoP = fusos[chave];
                const hora = getHoraFormatada(infoP.tz);
                return `🕐 *${infoP.nome}*\n\n⏰ *Hora atual:* ${hora}\n\n_dados em tempo real do submundo. 💀_`;
            }
            return `❌ Cidade "${rawTexto}" não encontrada.\n\nCidades disponíveis: ${Object.keys(fusos).join(', ')}`;
        }

        const hora = getHoraFormatada(info.tz);
        return `🕐 *${info.nome}*\n\n⏰ *Hora atual:* ${hora}\n\n_dados em tempo real do submundo. 💀_`;
    }
};

function getHoraFormatada(tz) {
    try {
        return new Date().toLocaleString('pt-BR', {
            timeZone: tz,
            weekday: 'long',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch {
        return 'Erro ao obter hora';
    }
}
