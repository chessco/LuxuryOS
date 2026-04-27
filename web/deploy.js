import Client from 'ssh2-sftp-client';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Cargar variables de entorno
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.deploy') });
dotenv.config();

const config = {
  host: process.env.DEPLOY_HOST,
  port: parseInt(process.env.DEPLOY_PORT || '22'),
  username: process.env.DEPLOY_USER,
  password: process.env.DEPLOY_PASSWORD,
  readyTimeout: 20000,
};

async function deploy() {
  const sftp = new Client();
  const localDir = path.join(__dirname, 'dist');
  const remoteDir = process.env.DEPLOY_REMOTE_PATH || 'public_html';

  if (!fs.existsSync(localDir)) {
    console.error('Error: La carpeta "dist" no existe. Ejecuta "npm run build" primero.');
    process.exit(1);
  }

  try {
    console.log(`Conectando a Hostinger (${config.host})...`);
    await sftp.connect(config);
    
    console.log(`Subiendo archivos de ${localDir} a ${remoteDir}...`);
    
    // Subir el contenido del directorio
    await sftp.uploadDir(localDir, remoteDir);

    console.log('¡Despliegue a Hostinger completado con éxito! 🚀');
  } catch (err) {
    console.error('Error en el despliegue:', err.message);
    process.exit(1);
  } finally {
    await sftp.end();
  }
}

deploy();
