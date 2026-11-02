/**
 * PM2 — GEB Equipment Loan (API Express)
 *
 * Usage (depuis la racine du dépôt, normalement via ./deploy_ubuntu.sh) :
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *
 * Charge server/.env (ou .env à la racine). NODE_ENV est forcé à production
 * pour que la valeur "development" d'un .env copié ne reste pas en prod.
 */
const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const projectRoot = __dirname;
const serverEnvPath = path.join(projectRoot, 'server', '.env');
const rootEnvPath = path.join(projectRoot, '.env');
const envFile = fs.existsSync(serverEnvPath)
  ? serverEnvPath
  : fs.existsSync(rootEnvPath)
    ? rootEnvPath
    : null;

if (!envFile) {
  console.warn(
    '[ecosystem.config.js] Aucun .env trouvé (server/ ou racine). Copiez server/.env.example avant de lancer PM2.',
  );
}

const envFromFile = envFile ? parseEnvFile(envFile) : {};

module.exports = {
  apps: [
    {
      name: 'geb-equipment-api',
      script: path.join(projectRoot, 'server', 'dist', 'index.js'),
      cwd: path.join(projectRoot, 'server'),
      env: {
        ...envFromFile,
        NODE_ENV: 'production',
        PORT: envFromFile.PORT || '3000',
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      max_memory_restart: '1G',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 20000,
      merge_logs: true,
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: path.join(projectRoot, 'logs', 'backend-error.log'),
      out_file: path.join(projectRoot, 'logs', 'backend-out.log'),
      watch: false,
    },
  ],
};
