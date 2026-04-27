const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  const email = 'vendedor@pitayacode.io';
  const command = `docker exec luxury-api-prod node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findUnique({ where: { email: '${email}' } })
  .then(user => {
    console.log('USER_INFO_START');
    console.log(JSON.stringify(user, null, 2));
    console.log('USER_INFO_END');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
"`;

  conn.exec(command, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', (data) => process.stdout.write(data))
          .stderr.on('data', (data) => process.stderr.write(data));
  });
}).on('error', (err) => {
  console.error('Connection error:', err);
}).connect({
  host: '46.224.155.43',
  port: 22,
  username: 'root',
  password: 'Frida.3136'
});
