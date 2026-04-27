const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  conn.exec('ls -R /opt/pitaya', (err, stream) => {
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
