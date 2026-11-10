import Client from 'ssh2-sftp-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const required = ['DEPLOY_HOST', 'DEPLOY_USER', 'DEPLOY_PASSWORD', 'DEPLOY_REMOTE_PATH'];
const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  throw new Error(`Missing deployment configuration: ${missing.join(', ')}`);
}

const localDir = path.join(__dirname, 'dist');
if (!fs.existsSync(localDir)) {
  throw new Error('dist/ does not exist. Run npm run build before deploying.');
}

const client = new Client();
try {
  await client.connect({
    host: process.env.DEPLOY_HOST.trim(),
    port: Number(process.env.DEPLOY_PORT || 22),
    username: process.env.DEPLOY_USER.trim(),
    password: process.env.DEPLOY_PASSWORD,
    readyTimeout: 20_000,
  });
  await client.uploadDir(localDir, process.env.DEPLOY_REMOTE_PATH.trim());
  console.log('Revendedores deployed successfully.');
} finally {
  await client.end();
}
