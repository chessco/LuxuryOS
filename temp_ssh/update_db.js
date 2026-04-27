const { Client } = require('ssh2');
const conn = new Client();

const commands = [
  'echo "=== UPDATING DATABASE SCHEMA ==="',
  'docker exec luxury-api-prod npx prisma db push --accept-data-loss',
  
  'echo "=== VERIFYING ENUM UPDATE ==="',
  "docker exec luxury-mysql-prod mysql -u root -pluxury_pass -e \"SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_NAME = 'User' AND COLUMN_NAME = 'role' AND TABLE_SCHEMA = 'luxury_os';\"",
  
  'echo "=== CREATING VENDEDOR USER ==="',
  // We will run a small script to insert the user if not exists
  "docker exec luxury-api-prod node -e \"const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.user.upsert({ where: { email: 'vendedor@pitayacode.io' }, update: { role: 'VENDEDOR' }, create: { email: 'vendedor@pitayacode.io', name: 'Vendedor Pitaya', password: 'pitaya123', role: 'VENDEDOR', tenantId: '564846d0-1b54-4927-a597-29cd113aeb5d' } }).then(u => console.log('User synced:', u.email)).catch(e => console.error(e)).finally(() => p.$disconnect())\""
];

conn.on('ready', () => {
  console.log('SSH Connection Established for DB Update');
  
  let combinedCmd = commands.join(' && ');
  
  conn.exec(combinedCmd, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      console.log('Update finished with code:', code);
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
