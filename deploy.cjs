const { Client } = require('ssh2');

const conn = new Client();
console.log('Connecting to Clouding.io server...');

conn.on('ready', () => {
  console.log('Client :: ready');
  const cmds = 'pm2 flush && journalctl --vacuum-size=20M && npm cache clean --force && rm -rf /tmp/* /var/tmp/* ~/.cache/* ~/.npm/* ~/.pm2/logs/*.log && cd ~/islamicreelsupdated && git pull origin main && npm install && npm run build && pm2 restart all';
  
  console.log(`Executing commands on server...`);
  conn.exec(cmds, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.error('STDERR: ' + data);
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
