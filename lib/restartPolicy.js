function shouldAutoRestart(error) {
    if (!error) return false;

    const text = `${error?.message || ''} ${error?.stack || ''}`.toLowerCase();
    const criticalSignals = [
        'out of memory',
        'heap out of memory',
        'fatal error',
        'sigterm',
        'sigkill',
        'sighup'
    ];

    return criticalSignals.some((signal) => text.includes(signal));
}

module.exports = {
    shouldAutoRestart
};
