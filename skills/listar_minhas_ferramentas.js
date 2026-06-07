const fs = require('fs');
const path = require('path');

module.exports = {
    definition: {
        function: {
            name: "listar_minhas_ferramentas",
            description: "Retorna a lista de todas as ferramentas e habilidades ativas instaladas no Bochecha-IA.",
            parameters: { type: "object", properties: {} }
        }
    },
    async execute(args, ctx) {
        const registry = global.registry;
        if (!registry || !registry.skills) {
            return "Erro: Registro de ferramentas indisponível.";
        }

        const list = [];
        for (const name in registry.skills) {
            const skill = registry.skills[name];
            const fn = skill.definition?.function;
            if (fn) {
                list.push(`🔧 *${fn.name}*: ${fn.description || 'Sem descrição'}`);
            }
        }

        if (list.length === 0) {
            return "Não encontrei nenhuma ferramenta registrada.";
        }

        return `Aqui estão todas as ferramentas e habilidades que eu tenho ativas no momento:\n\n${list.join('\n\n')}`;
    }
};
