const { Client } = require('ssh2');
const conn = new Client();

const commands = [
  'echo "=== RENAMING FOLDERS ON SERVER ==="',
  'mv /opt/pitaya/luxuryos/frontend /opt/pitaya/luxuryos/web',
  'mv /opt/pitaya/luxuryos/scripts/build-frontend.sh /opt/pitaya/luxuryos/scripts/build-web.sh',
  
  'echo "=== UPDATING BUILD SCRIPT ON SERVER ==="',
  "sed -i 's/FRONTEND_DIR=\"frontend\"/FRONTEND_DIR=\"web\"/g' /opt/pitaya/luxuryos/scripts/build-web.sh",
  "sed -i 's/Preparing Frontend/Preparing Web/g' /opt/pitaya/luxuryos/scripts/build-web.sh",
  "sed -i 's/Frontend is ready/Web is ready/g' /opt/pitaya/luxuryos/scripts/build-web.sh",
  
  'echo "=== VERIFYING SERVER STRUCTURE ==="',
  'ls -la /opt/pitaya/luxuryos'
];

conn.on('ready', () => {
  console.log('SSH Connection Established for Renaming');
  
  let combinedCmd = commands.join(' && ');
  
  conn.exec(combinedCmd, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      console.log('Renaming finished with code:', code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('Connection error:', err);
}).connect({
  host: '46.224.155.43',
  port: 22,
  username: 'root',
  password: 'Frida.3136'
});
