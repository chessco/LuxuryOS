#!/usr/bin/env node
/**
 * Entorno local aislado de LuxuryOS.
 *
 * Servicios:
 * - API NestJS:              http://localhost:3002
 * - Cared web:               http://localhost:3000
 * - Revendedores:            http://localhost:3001
 * - MySQL de pruebas:        localhost:3310 / luxury_pos_test
 *
 * Uso normal:  node scripts/dev-local.mjs
 * Reiniciar DB: node scripts/dev-local.mjs --reset-db --seed
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const args = new Set(process.argv.slice(2));
const mysqlPort = Number(process.env.LUXURYOS_LOCAL_MYSQL_PORT || 3310);
const databaseUrl = process.env.LUXURYOS_LOCAL_DATABASE_URL
  || `mysql://luxury_pos:luxury_pos@127.0.0.1:${mysqlPort}/luxury_pos_test`;
const resetDb = args.has('--reset-db');
const seedDb = args.has('--seed');
const skipDb = args.has('--skip-db');

const color = { reset: '\x1b[0m', cyan: '\x1b[36m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', magenta: '\x1b[35m', gray: '\x1b[90m' };

function command(commandName, commandArgs) {
  return isWindows
    ? { bin: 'cmd.exe', args: ['/d', '/s', '/c', commandName, ...commandArgs] }
    : { bin: commandName, args: commandArgs };
}

function log(message, tone = color.cyan) {
  console.log(`${tone}${message}${color.reset}`);
}

function run(commandName, commandArgs, cwd, label, env = process.env) {
  log(`→ ${label}`, color.green);
  const spec = command(commandName, commandArgs);
  const result = spawnSync(spec.bin, spec.args, { cwd, stdio: 'inherit', env });
  if (result.status !== 0) throw new Error(`${label} falló (código ${result.status ?? 'desconocido'}).`);
}

function tryRun(commandName, commandArgs, cwd) {
  const spec = command(commandName, commandArgs);
  return spawnSync(spec.bin, spec.args, { cwd, stdio: 'ignore' }).status === 0;
}

function dependencyDirectory(name) {
  const directory = path.join(rootDir, name);
  if (!fs.existsSync(path.join(directory, 'node_modules'))) {
    run('npm', ['ci'], directory, `Instalando dependencias en ${name}/`);
  }
}

function isPortOpen(port, timeout = 700) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, '127.0.0.1');
  });
}

function assertIsolatedDatabase() {
  const parsed = new URL(databaseUrl);
  const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!localHosts.has(parsed.hostname) || databaseName !== 'luxury_pos_test') {
    throw new Error('La sincronización local sólo acepta localhost y la base luxury_pos_test. Revisa LUXURYOS_LOCAL_DATABASE_URL.');
  }
}

async function ensureDatabase() {
  if (skipDb) return false;
  assertIsolatedDatabase();
  if (!(await isPortOpen(mysqlPort))) {
    log('→ Iniciando MySQL aislado', color.green);
    const startedExisting = tryRun('docker', ['start', 'luxury-pos-test-mysql'], rootDir);
    if (!startedExisting) {
      run('docker', ['compose', '-p', 'luxury-pos-test', '-f', 'docker-compose.pos-test.yml', 'up', '-d', 'mysql'], rootDir, 'Creando MySQL aislado');
    }
  }
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await isPortOpen(mysqlPort, 1000)) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`MySQL no respondió en localhost:${mysqlPort}.`);
}

async function assertServicePortsAvailable() {
  for (const [port, name] of [[3002, 'API'], [3000, 'Cared web'], [3001, 'Revendedores']]) {
    if (await isPortOpen(port, 300)) throw new Error(`El puerto ${port} (${name}) ya está en uso. Detén el entorno anterior antes de iniciarlo.`);
  }
}

function pipe(child, label, tone) {
  for (const stream of [child.stdout, child.stderr]) {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) if (line.trim()) console.log(`${tone}[${label}]${color.reset} ${line}`);
    });
  }
}

async function main() {
  log('LuxuryOS local: API + Cared + Revendedores', color.cyan);
  await assertServicePortsAvailable();
  for (const directory of ['api', 'web', 'reseller-web']) dependencyDirectory(directory);

  const databaseReady = await ensureDatabase();
  const apiDir = path.join(rootDir, 'api');
  const localEnv = { ...process.env, DATABASE_URL: databaseUrl };
  run('npx', ['prisma', 'generate'], apiDir, 'Generando Prisma Client', localEnv);
  if (databaseReady) {
    run('npx', ['prisma', 'db', 'push', ...(resetDb ? ['--force-reset'] : [])], apiDir, 'Sincronizando esquema de la base local', localEnv);
    if (seedDb) run('npx', ['prisma', 'db', 'seed'], apiDir, 'Sembrando datos de prueba', { ...localEnv, SEED_PASSWORD: process.env.SEED_PASSWORD || 'cared123' });
  }

  const services = [
    { label: 'API', tone: color.cyan, cwd: apiDir, args: ['run', 'start:dev'], env: { ...localEnv, PORT: '3002' } },
    { label: 'CARED-WEB', tone: color.red, cwd: path.join(rootDir, 'web'), args: ['run', 'dev'], env: { ...process.env, VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:3002' } },
    { label: 'REVENDEDOR', tone: color.magenta, cwd: path.join(rootDir, 'reseller-web'), args: ['run', 'dev'], env: { ...process.env, VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:3002' } },
  ];
  const children = services.map((service) => {
    const spec = command('npm', service.args);
    const child = spawn(spec.bin, spec.args, { cwd: service.cwd, env: service.env, stdio: ['ignore', 'pipe', 'pipe'] });
    pipe(child, service.label, service.tone);
    return child;
  });
  const stop = () => {
    for (const child of children) {
      if (!child.pid) continue;
      if (isWindows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      else child.kill('SIGTERM');
    }
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  console.log(`\nCared: http://localhost:3000 | Revendedores: http://localhost:3001 | API: http://localhost:3002`);
  console.log('Base local aislada: luxury_pos_test. Credenciales demo: admin@cared.mx / cared123 (usa --seed).');
}

main().catch((error) => { console.error(`${color.red}[ERROR] ${error.message}${color.reset}`); process.exit(1); });
