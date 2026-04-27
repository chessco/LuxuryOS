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
    console.log('--- Root Directory ---');
    let list = await sftp.list('.');
    console.log(list.map(f => `${f.type} ${f.name}`).join('\n'));

    if (list.find(f => f.name === 'domains')) {
      console.log('\n--- Domains Directory ---');
      let domains = await sftp.list('./domains');
      console.log(domains.map(f => `${f.type} ${f.name}`).join('\n'));
      
      for (const d of domains) {
          if (d.type === 'd') {
              console.log(`\n--- domains/${d.name}/public_html ---`);
              try {
                let sub = await sftp.list(`./domains/${d.name}/public_html`);
                console.log(sub.map(f => `${f.type} ${f.name}`).join('\n'));
              } catch (e) { console.log('Not found'); }
          }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await sftp.end();
  }
}

check();
