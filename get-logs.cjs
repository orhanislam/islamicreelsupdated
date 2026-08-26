const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('pm2 logs --lines 150 --nostream', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).connect({
  host: '93.189.88.228',
  port: 22,
  username: 'root',
  password: 'Password1!'
});
