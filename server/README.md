# VeganLand API

Backend central do VeganLand. Ele recebe a imagem do app, identifica produto/ingredientes com Anthropic, consulta o PostgreSQL central, busca no Open Food Facts quando necessário e salva produtos/análises para reutilização.

## Banco PostgreSQL proprio

Para desenvolvimento local com Docker:

```bash
docker compose up -d --build
```

Use esta `DATABASE_URL` em `server/.env`:

```bash
POSTGRES_PASSWORD=change-this-postgres-password
DATABASE_URL=postgres://veganland:change-this-postgres-password@postgres:5432/veganland
```

Depois rode a migração dentro do container da API:

```bash
docker compose exec api npm run db:migrate
```

## Produção em VPS

No servidor, instale Docker e rode o mesmo `docker-compose.yml`, alterando `POSTGRES_PASSWORD` para uma senha forte.

Em produção, não exponha a porta `5432` publicamente. Deixe a API e o PostgreSQL na mesma rede privada. Se precisar acessar de fora para manutenção, use SSH tunnel.

Exemplo de variáveis da API:

```bash
PORT=3000
POSTGRES_PASSWORD=SENHA_FORTE
DATABASE_URL=postgres://veganland:SENHA_FORTE@postgres:5432/veganland
ANTHROPIC_API_KEY=sk-ant-...
APP_API_KEY=um-segredo-para-o-app
```

Subir tudo em produção:

```bash
docker compose up -d --build
docker compose exec api npm run db:migrate
```

## Rotas

- `GET /health`: verifica API e banco.
- `POST /analyze-product`: analisa uma imagem.

Payload:

```json
{
  "imageBase64": "...",
  "mediaType": "image/jpeg",
  "profile": { "dietId": "vegan", "allergyIds": [] },
  "language": "pt"
}
```
