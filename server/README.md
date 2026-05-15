# VeganLand API

Backend central do VeganLand. Ele recebe a imagem do app, identifica produto/ingredientes com Anthropic, consulta o PostgreSQL central, busca no Open Food Facts quando necessário e salva produtos/análises para reutilização.

## Banco PostgreSQL proprio

Para desenvolvimento local:

```bash
docker compose up -d postgres
```

Use esta `DATABASE_URL` em `server/.env`:

```bash
DATABASE_URL=postgres://veganland:change-this-postgres-password@localhost:5432/veganland
```

Depois rode:

```bash
npm install
npm run db:migrate
npm start
```

## Produção em VPS

No servidor, instale Docker e rode o mesmo `docker-compose.yml`, alterando `POSTGRES_PASSWORD` para uma senha forte.

Em produção, não exponha a porta `5432` publicamente. Deixe a API e o PostgreSQL na mesma rede privada. Se precisar acessar de fora para manutenção, use SSH tunnel.

Exemplo de variáveis da API:

```bash
PORT=3000
DATABASE_URL=postgres://veganland:SENHA_FORTE@postgres:5432/veganland
ANTHROPIC_API_KEY=sk-ant-...
APP_API_KEY=um-segredo-para-o-app
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
