const axios = require('axios');

module.exports = {
    definition: {
        function: {
            name: "consultar_dados",
            description: "Faz uma consulta avançada de OSINT (Puxar Dados VIP) usando a API Gonzales.",
            parameters: {
                type: "object",
                properties: {
                    tipo: {
                        type: "string",
                        description: "O tipo de consulta. Opções: cpf, nome, score, placa, cnh, parentes, vizinhos, instagram, email, cnpj, renavam, cep"
                    },
                    query: {
                        type: "string",
                        description: "O valor a ser consultado (ex: o número do CPF, Nome completo, Placa)."
                    }
                },
                required: ["tipo", "query"]
            }
        }
    },
    async execute(args, { sock, from }) {
        await sock.sendMessage(from, { text: `🔎 Conectando à Central de Dados VIP (GonzalesDev) para buscar: *${args.tipo.toUpperCase()}*...` });
        
        const CONSULTAS_TOKEN = '6b37bf08416e08c4276b4d55cc276be2';
        const CONSULTAS_API_BASE = 'https://apis.gonzalesdev.shop';
        
        try {
            let tipoEndpoint = args.tipo.toLowerCase();
            let cleanQuery = args.query.trim().replace(/[^A-Za-z0-9@._-\s]/g, ''); // Limpeza básica
            
            // Montagem inteligente de URLs para englobar os padrões mais comuns dessas APIs
            let url = `${CONSULTAS_API_BASE}/api/${tipoEndpoint}?token=${CONSULTAS_TOKEN}&${tipoEndpoint === 'nome' ? 'nome' : 'q'}=${encodeURIComponent(cleanQuery)}`;
            
            if (tipoEndpoint === 'cpf') url = `${CONSULTAS_API_BASE}/api/cpf?token=${CONSULTAS_TOKEN}&cpf=${cleanQuery}`;
            if (tipoEndpoint === 'cnpj') url = `${CONSULTAS_API_BASE}/api/cnpj?token=${CONSULTAS_TOKEN}&cnpj=${cleanQuery}`;
            
            // Tentativa de puxar os dados
            let data;
            try {
                const response = await axios.get(url, { timeout: 15000 });
                data = response.data;
            } catch (err) {
                // Se der erro 404, tenta o segundo padrão de URL comum
                const altUrl = `${CONSULTAS_API_BASE}/api/consultas/${tipoEndpoint}?token=${CONSULTAS_TOKEN}&query=${encodeURIComponent(cleanQuery)}`;
                const altResponse = await axios.get(altUrl, { timeout: 15000 });
                data = altResponse.data;
            }
            
            if (data && !data.error && !data.erro) {
                // Entrega para a IA formatar o Dossiê
                return `DADOS OBTIDOS COM SUCESSO: ${JSON.stringify(data).substring(0, 2000)}. \n\nINSTRUÇÃO PARA A IA: Você é o sistema de Inteligência Bochecha. Formate esses dados como um DOSSIÊ investigativo profissional, limpo e impressionante. Organize as informações (Nome, CPF, Mãe, Endereços, Telefones) em tópicos e use emojis. Não mostre código JSON ao usuário.`;
            } else {
                return `A API Gonzales não encontrou resultados ou retornou erro. Dados brutos: ${JSON.stringify(data)}`;
            }
            
        } catch (e) {
            return `Erro de conexão com a API GonzalesDev: ${e.message}. Talvez o link da API seja ligeiramente diferente.`;
        }
    }
};
