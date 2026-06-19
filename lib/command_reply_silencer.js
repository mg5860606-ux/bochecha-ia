function shouldSilenceCommandReply(body) {
  if (typeof body !== 'string') return false;
  const trimmed = body.trim();
  return trimmed.startsWith('/') || trimmed.startsWith('.') || trimmed.startsWith('!');
}

module.exports = {
  shouldSilenceCommandReply
};
