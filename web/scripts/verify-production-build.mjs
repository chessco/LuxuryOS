import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const LOOPBACK_PATTERN = /(?:https?:\/\/)?(?:localhost|127(?:\.\d{1,3}){3}|\[?::1\]?)(?::\d+)?/i;
// Dependencies can legitimately contain generic localhost references. Only the API's
// development endpoint is dangerous in a production bundle.
const LOOPBACK_API_PATTERN = /(?:https?:\/\/)?(?:localhost|127(?:\.\d{1,3}){3}|\[?::1\]?)(?::3002)(?:[/'"`]|$)/i;
export const PRODUCTION_API_URL = 'https://luxury-api.pitayacode.io';
export const BUILD_CONFIG_FILE = 'build-config.json';

export function assertProductionApiUrl(configuredUrl) {
  const normalizedUrl = String(configuredUrl || '').trim().replace(/\/$/, '');
  if (LOOPBACK_PATTERN.test(normalizedUrl)) throw new Error('Production API URL points to a loopback address. Build blocked.');
  if (normalizedUrl !== PRODUCTION_API_URL) throw new Error(`VITE_API_URL must be ${PRODUCTION_API_URL} for production builds.`);
  return normalizedUrl;
}
export function validateProductionBundle(bundleContents) {
  const bundle = bundleContents.join('\n');
  if (LOOPBACK_API_PATTERN.test(bundle)) throw new Error('Production bundle contains a loopback API URL. Deployment blocked.');
  if (!bundle.includes(PRODUCTION_API_URL)) throw new Error(`Production bundle does not contain ${PRODUCTION_API_URL}. Deployment blocked.`);
}
export function readProductionBundles(rootDir = process.cwd()) {
  const assetsDir = path.join(rootDir, 'dist', 'assets');
  const javascriptFiles = fs.readdirSync(assetsDir, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith('.js')).map((entry) => path.join(assetsDir, entry.name));
  if (!javascriptFiles.length) throw new Error('No production JavaScript bundles were found. Deployment blocked.');
  return javascriptFiles.map((filePath) => fs.readFileSync(filePath, 'utf8'));
}
export function validateProductionMetadata(rootDir = process.cwd()) {
  const metadataPath = path.join(rootDir, 'dist', BUILD_CONFIG_FILE);
  if (!fs.existsSync(metadataPath)) throw new Error(`Production metadata ${BUILD_CONFIG_FILE} is missing. Deployment blocked.`);
  assertProductionApiUrl(JSON.parse(fs.readFileSync(metadataPath, 'utf8')).apiUrl);
}
export function verifyProductionBuild(rootDir = process.cwd()) { validateProductionMetadata(rootDir); validateProductionBundle(readProductionBundles(rootDir)); }
function main() { verifyProductionBuild(); console.log(`Production bundle verified: ${PRODUCTION_API_URL}`); }
const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) main();
