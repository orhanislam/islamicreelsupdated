const { Client } = require('ssh2');

const conn = new Client();
console.log('Connecting to Clouding.io server to fetch PM2 logs...');

conn.on('ready', () => {
  console.log('Client :: ready');
  const cmds = `pm2 logs islamic-reels --lines 100 --nostream`;
  
  conn.exec(cmds, (err, stream) => {
    if (err) throw err;
    let fullOutput = '';
    stream.on('close', (code, signal) => {
      console.log('Logs:\n' + fullOutput);
      conn.end();
    }).on('data', (data) => {
      fullOutput += data.toString();
    }).stderr.on('data', (data) => {
      fullOutput += data.toString();
    });
  });
}).on('error', (err) => {
  console.error('Connection error:', err.message);
}).connect({
  host: '93.189.88.228',
  port: 22,
  username: 'root',
  password: 'j20022002j!'
});
