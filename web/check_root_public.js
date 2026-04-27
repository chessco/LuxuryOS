import Client from 'ssh2-sftp-client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const config = {
  host: process.env.DEPLOY_HOST,
  port: parseInt(process.env.DEPLOY_PORT || '22'),
  username: process.env.DEPLOY_USER,
  password: process.env.DEPLOY_PASSWORD,
};

async function check() {
  const sftp = new Client();
  try {
    await sftp.connect(config);
    console.log('--- Root public_html ---');
    try {
      let list = await sftp.list('./public_html');
      console.log(list.map(f => `${f.type} ${f.name}`).join('\n'));
    } catch (e) { console.log('Not found'); }
  } catch (err) {
    console.error(err);
  } finally {
    await sftp.end();
  }
}

check();
