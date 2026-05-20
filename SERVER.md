# VeganLand — Server Operations Guide

## Stack

- **VPS**: Ubuntu, `/opt/veganland`
- **API**: Node.js (ESM), PM2 process name `veganland-api`
- **DB**: PostgreSQL, local socket, database `veganland`
- **Web**: Static files at `/var/www/veganland` served by nginx
- **Domain**: veganland.app (Certbot SSL)

## Directory structure

```
/opt/veganland/
  server/
    src/
      server.js       — HTTP server (routes)
      db.js           — all DB queries
      migrate.js      — DB migrations (run manually)
      email.js        — nodemailer SMTP
      legal.js        — Terms / Privacy / Imprint HTML
      analyze.js      — AI product analysis
      auth.js         — JWT + bcrypt
    .env              — secrets (never in git)
    package.json
  dist/               — built web app (expo export)
```

## Environment variables (`/opt/veganland/server/.env`)

```
PORT=3000
DATABASE_URL=postgres://veganland:<PASSWORD>@localhost:5432/veganland?sslmode=disable
DATABASE_SSL=false
ANTHROPIC_API_KEY=...
APP_API_KEY=...
JWT_SECRET=...
APP_URL=https://veganland.app

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contact@veganland.app
SMTP_PASS=...
SMTP_FROM=VeganLand <contact@veganland.app>
```

Edit with:
```bash
nano /opt/veganland/server/.env
```

## Deploy web app (after local changes)

Run locally:
```bash
cd /path/to/veganland && npm run build:deploy
```

This builds the Expo web app, copies to `/var/www/veganland` and restarts PM2.

## Deploy server code only (no web rebuild)

```bash
pm2 restart veganland-api --update-env
```

Use `--update-env` whenever `.env` was changed.

## Run DB migrations

```bash
cd /opt/veganland/server && npm run db:migrate
```

If a migration is missing from `migrate.js` (server code outdated), create the table manually:

```bash
psql postgres://veganland:<PASSWORD>@localhost:5432/veganland?sslmode=disable
```

### Required tables (in addition to `users`)

```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour',
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_confirmation_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scan_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT,
  source TEXT,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scan_counters (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## PM2 commands

```bash
pm2 list                              # show all processes
pm2 restart veganland-api --update-env  # restart + reload .env
pm2 logs veganland-api --lines 30 --nostream  # last 30 log lines
pm2 logs veganland-api                # live tail (Ctrl+C to exit)
```

## nginx config

File: `/etc/nginx/sites-available/veganland.app`

Key proxy routes (all prefix-matched, no regex fallthrough):
- `location /admin` — admin dashboard
- `location /legal` — Terms, Privacy, Imprint
- `location ~ ^/(analyze-product|health|auth/.+|user/.+|scan/.+|admin/?|admin/user/.+|legal/.+)$` — API

After editing nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Test email (password reset)

```bash
curl -s -X POST https://veganland.app/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'
```

Should return `{"ok":true}` and deliver an email within 1 minute.
If no email arrives, check logs: `pm2 logs veganland-api --lines 30 --nostream`

## Install missing npm packages on server

If `pm2 logs` shows `Cannot find package 'X'`:
```bash
cd /opt/veganland/server && npm install X && pm2 restart veganland-api --update-env
```
