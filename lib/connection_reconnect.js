function getReconnectPlan(statusCode, consecutiveFailures, isLoggedOut) {
  if (isLoggedOut) {
    return {
      shouldReconnect: false,
      shouldClearSession: true,
      delayMs: 3000,
      reason: 'logged-out'
    };
  }

  if (statusCode === 403 || statusCode === 401) {
    return {
      shouldReconnect: false,
      shouldClearSession: false,
      delayMs: 0,
      reason: 'forbidden'
    };
  }

  const shouldResetSession = (statusCode === 440 || statusCode === 408 || statusCode === 500 || statusCode === 502 || statusCode === 503) && consecutiveFailures >= 4;
  if (shouldResetSession) {
    return {
      shouldReconnect: true,
      shouldClearSession: true,
      delayMs: 15000,
      reason: 'transient-reset'
    };
  }

  const baseDelay = statusCode === 440 ? 15000 : statusCode === 408 ? 10000 : 3000;
  const delayMs = Math.min(baseDelay * Math.max(consecutiveFailures, 1), 60000);

  return {
    shouldReconnect: true,
    shouldClearSession: false,
    delayMs,
    reason: statusCode === 440 ? 'temporary-close' : 'transient'
  };
}

module.exports = {
  getReconnectPlan
};
