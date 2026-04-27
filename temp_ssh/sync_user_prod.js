const { Client } = require('ssh2');
const conn = new Client();

const command = "docker exec luxury-api-prod node -e \"const { PrismaClient } = require('@prisma/client'); const bcrypt = require('bcrypt'); const p = new PrismaClient(); const passHash = bcrypt.hashSync('pitaya123', 10); p.user.upsert({ where: { email: 'vendedor@pitayacode.io' }, update: { role: 'VENDEDOR', passwordHash: passHash }, create: { email: 'vendedor@pitayacode.io', name: 'Vendedor Pitaya', passwordHash: passHash, role: 'VENDEDOR', tenantId: '071ab28f-da33-4bf8-90ed-f8a1af880078' } }).then(u => console.log('User synced:', u.email)).catch(e => console.error(e)).finally(() => p.\\$disconnect());\"";

conn.on('ready', () => {
  console.log('SSH Connection Established for User Sync (Prod Tenant ID)');
  conn.exec(command, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('User sync finished with code:', code);
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
