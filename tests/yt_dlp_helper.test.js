const assert = require('assert');
const childProcess = require('child_process');
const path = require('path');

const helperPath = path.join(__dirname, '..', 'lib', 'ytDlpHelper.js');
const originalExec = childProcess.exec;

(async () => {
    try {
        let lastCommand = null;
        childProcess.exec = (command, options, callback) => {
            lastCommand = command;
            callback(null, '', '');
            return {};
        };

        delete require.cache[require.resolve(helperPath)];
        const YtDlpHelper = require(helperPath);
        YtDlpHelper.ensureBinary = async () => 'C:/fake/yt-dlp.exe';

        await YtDlpHelper.downloadVideo('https://example.com/video', 'C:/tmp/video.mp4');

        assert.match(lastCommand, /--max-duration 240/, 'Esperava o comando do yt-dlp limitar a duração a 240 segundos.');
        console.log('yt_dlp_helper duration limit regression check passed.');
    } catch (err) {
        console.error(err);
        process.exitCode = 1;
    } finally {
        childProcess.exec = originalExec;
        delete require.cache[require.resolve(helperPath)];
    }
})();
