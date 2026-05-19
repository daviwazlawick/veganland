#!/usr/bin/env bash
# VeganLand deploy script
set -euo pipefail

DOMAIN="veganland.app"
SERVER_ENV="/opt/veganland/server/.env"
FRONTEND_ENV="/opt/veganland/.env.production"

# Load server env
set -a
source "$SERVER_ENV"
set +a

echo "==> Subindo PostgreSQL com Docker..."
docker compose -f /opt/veganland/server/docker-compose.yml up -d postgres

echo "==> Aguardando banco de dados ficar pronto..."
until docker exec veganland-postgres pg_isready -U veganland -d veganland &>/dev/null; do
  sleep 2
done

echo "==> Executando migration do banco..."
cd /opt/veganland/server && node src/migrate.js

echo "==> Rebuild do frontend com env de producao..."
cd /opt/veganland
EXPO_PUBLIC_API_URL="https://$DOMAIN" \
EXPO_PUBLIC_APP_API_KEY="$APP_API_KEY" \
  npx expo export --platform web

cp -r /opt/veganland/dist/* /var/www/veganland/

echo "==> Iniciando/reiniciando API com pm2..."
pm2 startOrRestart /opt/veganland/ecosystem.config.cjs

echo "==> Iniciando nginx..."
systemctl enable nginx
systemctl restart nginx

echo ""
echo "Deploy concluido!"
echo "  - Frontend: https://$DOMAIN"
echo "  - API: https://$DOMAIN/health"
echo "  - pm2: pm2 logs veganland-api"
echo ""
echo "Para SSL, rode: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
