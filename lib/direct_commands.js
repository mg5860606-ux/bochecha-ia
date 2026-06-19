function resolveDirectCommand(body) {
  if (typeof body !== 'string') return null;

  const text = body.trim();
  if (!text) return null;

  const normalized = text.toLowerCase();
  const directPrefixes = ['/todos', '/marcar_todos', '/bv'];

  for (const prefix of directPrefixes) {
    if (normalized === prefix || normalized.startsWith(prefix + ' ')) {
      const message = text.replace(new RegExp(`^${prefix}\\s*`, 'i'), '').trim();
      return {
        skillName: 'marcar_todos',
        args: {
          mensagem: message || 'Chamando todo mundo!'
        }
      };
    }
  }

  const mentionAllPatterns = [
    /^marca todos$/i,
    /^marcar todos$/i,
    /^marcar todos\s+.+$/i,
    /^marca todos\s+.+$/i
  ];

  if (mentionAllPatterns.some((pattern) => pattern.test(text))) {
    const message = text.replace(/^marca todos\s*/i, '').replace(/^marcar todos\s*/i, '').trim();
    return {
      skillName: 'marcar_todos',
      args: {
        mensagem: message || 'Chamando todo mundo!'
      }
    };
  }

  return null;
}

module.exports = {
  resolveDirectCommand
};
