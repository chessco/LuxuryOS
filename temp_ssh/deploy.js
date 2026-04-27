const { Client } = require('ssh2');
const conn = new Client();

const commands = [
  'echo "=== A) PRECHECKS ==="',
  'docker ps | grep luxury-api-prod || true',
  'cd /opt/pitaya/luxuryos && docker compose -f docker-compose.prod.yml ps',
  'cd /opt/pitaya/luxuryos && git rev-parse --short HEAD && git status --porcelain',
  
  'echo "=== B) CODE UPDATE ==="',
  'cd /opt/pitaya/luxuryos && git fetch --all --prune && git reset --hard origin/main && git clean -fd',
  
  'echo "=== C) CONFIG SAFETY CHECK ==="',
  'ls -la /opt/pitaya/luxuryos/.env*',
  
  'echo "=== D) REBUILD & REDEPLOY ==="',
  'cd /opt/pitaya/luxuryos && docker compose -f docker-compose.prod.yml up -d --build api',
  
  'echo "=== E) VERIFICATION ==="',
  'docker ps | grep luxury-api-prod',
  'docker logs --tail 100 luxury-api-prod',
  'curl -i http://127.0.0.1:3002/ || true'
];

conn.on('ready', () => {
  console.log('SSH Connection Established');
  
  let combinedCmd = commands.join(' && ');
  
  conn.exec(combinedCmd, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      console.log('Final exit code:', code);
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
  password: 'Frida.3136',
  readyTimeout: 30000
});
