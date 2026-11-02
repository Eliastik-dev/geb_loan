#!/usr/bin/env bash
#
# GEB Equipment Loan — déploiement Ubuntu (install initiale + mises à jour).
# À lancer depuis la racine du dépôt : ./deploy_ubuntu.sh
# Mises à jour : git pull && ./deploy_ubuntu.sh
#
# DNS : materiel.pn2.geb doit pointer vers cette VM.
# Prérequis : server/.env (voir server/.env.example) et MySQL déjà en place.
#
set -euo pipefail

readonly APP_NAME="geb-equipment-api"
readonly NODE_VERSION="26.12.1"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
fail() { echo -e "${RED}[deploy] ERROR:${NC} $*" >&2; exit 1; }

if [[ ! -f "package.json" || ! -d "server" || ! -d "client" ]]; then
  fail "Ce script doit être lancé depuis la racine du dépôt geb-equipment-loan."
fi

ENV_FILE=""
if [[ -f "${SCRIPT_DIR}/server/.env" ]]; then
  ENV_FILE="${SCRIPT_DIR}/server/.env"
elif [[ -f "${SCRIPT_DIR}/.env" ]]; then
  ENV_FILE="${SCRIPT_DIR}/.env"
else
  fail "Fichier .env manquant. Copiez server/.env.example vers server/.env puis renseignez MySQL, SMTP et JWT_SECRET."
fi

read_env_var() {
  grep -E "^${1}=" "${ENV_FILE}" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || true
}

read_client_env_var() {
  local file="${SCRIPT_DIR}/client/.env"
  [[ -f "${file}" ]] || return 0
  grep -E "^${1}=" "${file}" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || true
}

redact_mysql_url() {
  echo "${1}" | sed -E 's|(mysql://[^:/?#]*):[^@/]*@|\1:***@|'
}

normalize_mysql_url() {
  local url="$1"
  if [[ "${url}" == mariadb://* ]]; then
    echo "mysql://${url#mariadb://}"
  else
    echo "${url}"
  fi
}

port_listener_pid() {
  local port="$1"
  ss -H -tlnp "sport = :${port}" 2>/dev/null \
    | sed -n 's/.*pid=\([0-9]*\).*/\1/p' \
    | head -1
}

wait_for_port_free() {
  local port="$1"
  local max_wait="${2:-15}"
  local i
  for ((i = 0; i < max_wait; i++)); do
    [[ -z "$(port_listener_pid "${port}")" ]] && return 0
    sleep 1
  done
  return 1
}

wait_for_health() {
  local port="$1"
  local max_wait="${2:-30}"
  local i body
  for ((i = 0; i < max_wait; i++)); do
    body="$(curl -sf --max-time 3 "http://127.0.0.1:${port}/api/health" 2>/dev/null || true)"
    if echo "${body}" | grep -q 'GEB Equipment Loan' \
      && echo "${body}" | grep -qE '"status"[[:space:]]*:[[:space:]]*"ok"'; then
      return 0
    fi
    sleep 1
  done
  return 1
}

log "Environnement : ${ENV_FILE}"

# ---------------------------------------------------------------------------
# 1. Prérequis Node / PM2
# ---------------------------------------------------------------------------
install_node() {
  local arch tarball url
  case "$(uname -m)" in
    x86_64) arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    *) fail "Architecture non supportée pour Node.js : $(uname -m)" ;;
  esac

  if ! command -v curl >/dev/null 2>&1 || ! command -v xz >/dev/null 2>&1; then
    log "Installation de curl et xz-utils..."
    sudo apt-get update
    sudo apt-get install -y curl ca-certificates tar xz-utils
  fi

  tarball="node-v${NODE_VERSION}-linux-${arch}.tar.xz"
  url="https://nodejs.org/dist/v${NODE_VERSION}/${tarball}"
  log "Installation de Node.js v${NODE_VERSION}..."
  curl -fsSL "${url}" -o "/tmp/${tarball}"
  sudo tar -xJf "/tmp/${tarball}" -C /usr/local --strip-components=1
  rm -f "/tmp/${tarball}"
  hash -r
}

INSTALLED_NODE=""
if command -v node >/dev/null 2>&1; then
  INSTALLED_NODE="$(node -v | sed 's/^v//')"
fi

if [[ "${INSTALLED_NODE}" != "${NODE_VERSION}" ]]; then
  if [[ -n "${INSTALLED_NODE}" ]]; then
    warn "Node.js v${INSTALLED_NODE} détecté — remplacement par v${NODE_VERSION}..."
  fi
  install_node
fi

hash -r
if [[ "$(node -v)" != "v${NODE_VERSION}" ]]; then
  fail "Node.js v${NODE_VERSION} requis, trouvé $(node -v) ($(command -v node))."
fi

log "Node.js $(node -v) / npm $(npm -v)"

if ! command -v curl >/dev/null 2>&1; then
  log "Installation de curl..."
  sudo apt-get update
  sudo apt-get install -y curl ca-certificates
fi

if ! command -v pm2 >/dev/null 2>&1; then
  log "Installation de PM2..."
  sudo npm install -g pm2
fi
log "PM2 $(pm2 -v)"

# ---------------------------------------------------------------------------
# 2. Dépendances + Prisma + build
# ---------------------------------------------------------------------------
DATABASE_URL="$(normalize_mysql_url "$(read_env_var DATABASE_URL)")"
if [[ -z "${DATABASE_URL}" || "${DATABASE_URL}" != mysql://* ]]; then
  fail "DATABASE_URL manquant ou invalide dans ${ENV_FILE} (doit commencer par mysql://)."
fi
export DATABASE_URL
log "Prisma DB : $(redact_mysql_url "${DATABASE_URL}")"

# NODE_ENV=production ferait omettre typescript / vite — indispensables au build.
log "Installation des dépendances npm (incl. devDependencies pour le build)..."
npm install --include=dev --prefix server
npm install --include=dev --prefix client

log "Prisma generate + migrate deploy..."
(
  cd server
  DATABASE_URL="${DATABASE_URL}" npx prisma generate
  DATABASE_URL="${DATABASE_URL}" npx prisma migrate deploy
)

log "Build server + client..."
npm run build --prefix server

# Les appels axios sont /loans, /equipment, … : la base doit se terminer par /api.
VITE_API_URL="$(read_client_env_var VITE_API_URL)"
if [[ -z "${VITE_API_URL}" ]]; then
  APP_URL="$(read_env_var APP_URL)"
  APP_URL="${APP_URL%/}"
  if [[ -n "${APP_URL}" ]]; then
    VITE_API_URL="${APP_URL}/api"
    log "client/.env sans VITE_API_URL — build avec ${VITE_API_URL}"
  else
    warn "VITE_API_URL absent — le client utilisera http://localhost:3000/api."
  fi
fi
if [[ -n "${VITE_API_URL}" && "${VITE_API_URL}" != */api && "${VITE_API_URL}" != */api/ ]]; then
  VITE_API_URL="${VITE_API_URL%/}/api"
  warn "VITE_API_URL complété avec /api → ${VITE_API_URL}"
fi
if [[ -n "${VITE_API_URL}" ]]; then
  export VITE_API_URL
fi
npm run build --prefix client

if [[ ! -f "server/dist/index.js" ]]; then
  fail "Build server échoué — server/dist/index.js absent."
fi
if [[ ! -f "client/dist/index.html" ]]; then
  fail "Build client échoué — client/dist/index.html absent."
fi

# ---------------------------------------------------------------------------
# 3. PM2
# ---------------------------------------------------------------------------
BACKEND_PORT="$(read_env_var PORT)"
BACKEND_PORT="${BACKEND_PORT:-3000}"
log "Port API (depuis .env) : ${BACKEND_PORT}"

mkdir -p "${SCRIPT_DIR}/logs"

if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  log "Recréation du process PM2 '${APP_NAME}'..."
  pm2 stop "${APP_NAME}" || true
  wait_for_port_free "${BACKEND_PORT}" 15 || true
  pm2 delete "${APP_NAME}" || true
  wait_for_port_free "${BACKEND_PORT}" 10 || true
else
  log "Démarrage PM2 '${APP_NAME}'..."
fi

if [[ -n "$(port_listener_pid "${BACKEND_PORT}")" ]]; then
  OWNER_PID="$(port_listener_pid "${BACKEND_PORT}")"
  fail "Le port ${BACKEND_PORT} est encore occupé (PID ${OWNER_PID}). Libérez-le puis relancez."
fi

pm2 start ecosystem.config.js
pm2 save
log "Liste PM2 sauvegardée."

log "Attente /api/health sur le port ${BACKEND_PORT}..."
if ! wait_for_health "${BACKEND_PORT}" 40; then
  pm2 status "${APP_NAME}" 2>/dev/null || true
  pm2 logs "${APP_NAME}" --lines 40 --nostream 2>/dev/null || true
  fail "API inaccessible après démarrage PM2 — voir les logs ci-dessus."
fi
log "Health check OK — http://127.0.0.1:${BACKEND_PORT}/api/health"

# ---------------------------------------------------------------------------
# 4. Nginx
# ---------------------------------------------------------------------------
SERVER_NAME="$(read_env_var SERVER_NAME)"
if [[ -z "${SERVER_NAME}" ]]; then
  APP_URL="$(read_env_var APP_URL)"
  SERVER_NAME="${APP_URL#http://}"
  SERVER_NAME="${SERVER_NAME#https://}"
  SERVER_NAME="${SERVER_NAME%%/*}"
  SERVER_NAME="${SERVER_NAME%%:*}"
fi
SERVER_NAME="${SERVER_NAME:-materiel.pn2.geb}"

NGINX_PORT="$(read_env_var NGINX_PORT)"
NGINX_PORT="${NGINX_PORT:-80}"

generate_nginx_config() {
  sed \
    -e "s|__DEPLOY_ROOT__|${SCRIPT_DIR}|g" \
    -e "s|__SERVER_NAME__|${SERVER_NAME}|g" \
    -e "s|__NGINX_PORT__|${NGINX_PORT}|g" \
    -e "s|__BACKEND_PORT__|${BACKEND_PORT}|g" \
    nginx.conf.template
}

log "Génération de nginx.conf.generated..."
generate_nginx_config > nginx.conf.generated

if command -v nginx >/dev/null 2>&1; then
  log "Installation du site Nginx (${SERVER_NAME})..."
  if generate_nginx_config | sudo tee /etc/nginx/sites-available/materiel >/dev/null \
    && sudo ln -sfn /etc/nginx/sites-available/materiel /etc/nginx/sites-enabled/materiel; then
    if sudo nginx -t; then
      sudo systemctl reload nginx
      log "Nginx rechargé — http://${SERVER_NAME}/"
    else
      warn "Test Nginx échoué — corrigez nginx.conf.generated avant reload."
    fi
  else
    warn "Installation Nginx échouée (sudo requis). Installez manuellement :"
    echo "  sudo cp nginx.conf.generated /etc/nginx/sites-available/materiel"
    echo "  sudo ln -sfn /etc/nginx/sites-available/materiel /etc/nginx/sites-enabled/materiel"
    echo "  sudo nginx -t && sudo systemctl reload nginx"
  fi
else
  warn "Nginx non installé — nginx.conf.generated est prêt."
fi

# ---------------------------------------------------------------------------
# 5. Résumé
# ---------------------------------------------------------------------------
PUBLIC_URL="http://${SERVER_NAME%% *}"
if [[ "${NGINX_PORT}" != "80" ]]; then
  PUBLIC_URL="${PUBLIC_URL}:${NGINX_PORT}"
fi

echo ""
log "Déploiement terminé."
echo "  - URL publique :  ${PUBLIC_URL}/"
echo "  - DNS :           ${SERVER_NAME} doit pointer vers cette VM"
echo "  - API (PM2) :     ${APP_NAME} → http://127.0.0.1:${BACKEND_PORT}"
echo "  - Health :        curl -s http://127.0.0.1:${BACKEND_PORT}/api/health"
echo "  - Frontend :      ${SCRIPT_DIR}/client/dist/"
echo "  - Nginx :         ${SCRIPT_DIR}/nginx.conf.generated"
echo ""
echo "  pm2 status"
echo "  pm2 logs ${APP_NAME}"
echo ""
warn "Pour les mises à jour : git pull && ./deploy_ubuntu.sh"
warn "Ne pas utiliser 'pm2 restart all' seul (pas de rebuild, et les autres apps de la VM redémarrent)."
echo ""
