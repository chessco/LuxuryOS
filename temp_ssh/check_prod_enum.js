const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  // Try to check the enum values in the DB
  const cmd = "docker exec luxury-mysql-prod mysql -u root -pluxury_pass -e \"SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_NAME = 'User' AND COLUMN_NAME = 'role' AND TABLE_SCHEMA = 'luxury_os';\"";
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', (data) => process.stdout.write(data))
          .stderr.on('data', (data) => process.stderr.write(data));
  });
}).connect({
  host: '46.224.155.43',
  port: 22,
  username: 'root',
  password: 'Frida.3136'
});
