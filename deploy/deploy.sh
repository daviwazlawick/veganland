#!/usr/bin/env bash
# Deploy da V2: build web local, sobe código + dist, reconstrói a API e roda migrações.
set -euo pipefail
cd "$(dirname "$0")/.."
HOST=root@76.13.238.26
DIR=/opt/novaqi-v2
KEY=$(ssh $HOST "grep ^APP_API_KEY= $DIR/deploy/.env | cut -d= -f2")
BRAND=novaqi EXPO_PUBLIC_BRAND=novaqi EXPO_PUBLIC_V2=1 \
EXPO_PUBLIC_API_URL=https://novaqi-v2.76-13-238-26.sslip.io EXPO_PUBLIC_APP_API_KEY="$KEY" \
  npx expo export --platform web --clear >/dev/null
git archive HEAD server deploy | ssh $HOST "mkdir -p $DIR && tar -x -C $DIR"
tar -c dist | ssh $HOST "rm -rf $DIR/dist && tar -x -C $DIR"
ssh $HOST "cd $DIR/deploy && docker compose up -d --build && docker compose exec -T api node src/migrate.js | tail -3"
echo "ok: https://novaqi-v2.76-13-238-26.sslip.io"
