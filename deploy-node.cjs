const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();

const envContent = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const base64Env = Buffer.from(envContent).toString('base64');

const sshCmd = `pm2 flush 2>/dev/null; journalctl --vacuum-size=10M 2>/dev/null; npm cache clean --force 2>/dev/null; rm -rf /tmp/* /var/tmp/* ~/.cache/* /root/.cache/* ~/.pm2/logs/* /root/.pm2/logs/* /var/log/*.gz ~/islamicreelsupdated/tmp ~/islamicreelsupdated/.output/tmp 2>/dev/null; DIR=$(find / -maxdepth 5 -name package.json 2>/dev/null | grep -v node_modules | grep -v "\\.output" | head -n 1 | xargs dirname); echo "Found root project directory: $DIR"; cd "$DIR" && git fetch origin && git reset --hard origin/main && echo "${base64Env}" | base64 -d > .env && npm install --force && npm run build && (systemctl restart nginx 2>/dev/null || true) && pm2 delete all 2>/dev/null; if systemctl is-active --quiet nginx; then echo "Nginx active -> Starting app on PORT=3000"; PORT=3000 pm2 start .output/server/index.mjs --name islamic-reels --node-args="--env-file=.env"; else echo "No Nginx -> Starting app directly on PORT=80"; PORT=80 pm2 start .output/server/index.mjs --name islamic-reels --node-args="--env-file=.env"; fi && pm2 save && pm2 status && df -h`;

console.log("Connecting to SSH...");

conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(sshCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).on('error', (err) => {
  console.error("Connection Error:", err);
}).connect({
  host: '93.189.88.228',
  port: 22,
  username: 'root',
  password: 'j20022002j!'
});
