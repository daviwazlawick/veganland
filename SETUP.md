# VeganLand - Setup Instructions

## 🌱 O que é VeganLand?

Um app que permite aos usuários:
1. **Criar um perfil** com suas preferências dietéticas (vegan, vegetariano, etc) e alergias
2. **Fotografar produtos** no supermercado
3. **Buscar ingredientes** na imagem, banco central ou Open Food Facts
4. **Receber análise instantânea** via IA se o produto é seguro para seu perfil

## 📋 Requisitos

- **Node.js** 18+ instalado
- **PostgreSQL** proprio, local ou em VPS/servidor
- **Docker** recomendado para rodar PostgreSQL
- **Expo CLI**: `npm install -g expo-cli`
- **Claude API Key**: de https://console.anthropic.com

## 🚀 Setup Inicial

### 1. Obter API Key da Anthropic

1. Vá para https://console.anthropic.com
2. Crie uma conta (grátis)
3. Gere uma nova API key
4. Copie a chave (começa com `sk-ant-`)

### 2. Subir o PostgreSQL

Para desenvolvimento local, suba o banco com Docker:

```bash
npm run db:up
```

Isso cria um PostgreSQL local com:

```bash
host=localhost
port=5432
database=veganland
user=veganland
password=change-this-postgres-password
```

### 3. Configurar o Backend

Instale as dependências do servidor:

```bash
npm run server:install
```

Crie `server/.env`:

```bash
PORT=3000
DATABASE_URL=postgres://veganland:change-this-postgres-password@localhost:5432/veganland
ANTHROPIC_API_KEY=sk-ant-...
APP_API_KEY=change-this-shared-secret
```

Rode a migração do banco:

```bash
npm run server:migrate
```

Inicie a API:

```bash
npm run server:start
```

Teste:

```bash
curl http://localhost:3000/health
```

Deve retornar:

```json
{"ok":true}
```

### 4. Configurar o App

Crie `.env` na raiz do projeto:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_APP_API_KEY=change-this-shared-secret
```

Para celular físico, troque `localhost` pelo IP da sua máquina ou pela URL hospedada da API.

### 5. Rodar o App

```bash
npm start
```

Isso abrirá o Expo CLI. Você terá opções:

- **iOS**: Pressione `i` (precisa do Simulator instalado)
- **Android**: Pressione `a` (precisa do Android Studio/Emulator)
- **Físico**: Instale o app Expo Go no seu iPhone/Android, escaneie o QR code

### 6. Primeiro Uso

1. Clique em "Começar" / "Get Started"
2. Escolha sua dieta (Vegan, Vegetariano, etc)
3. Escolha suas alergias (se houver)
4. Vá para a aba "Início" e clique em "Escanear Produto"
5. Tire uma foto do rótulo ou lista de ingredientes
6. O app analisará com Claude e dirá se é seguro! ✅

## 💰 Custos

- Análise de uma foto: ~$0.01 USD
- Primeiros 5 dólares são grátis na Anthropic
- Preço é baixo, pois usa o modelo Claude 3.5 Sonnet (rápido)

## 📱 Plataformas

- **iOS**: Suportado nativamente (iPhone)
- **Android**: Suportado nativamente
- **Web**: Não suportado (precisa de câmera)

## 🔐 Segurança

- Sua chave Anthropic fica apenas no backend
- Produtos e análises ficam no banco central PostgreSQL
- Suas fotos são **analisadas mas não armazenadas** pela Claude
- Seu perfil é **local** no seu dispositivo

## 🚀 Produção com PostgreSQL próprio

Para produção, use uma VPS ou servidor com Docker.

1. Copie a pasta `server/` para o servidor.
2. Edite `server/docker-compose.yml` e troque `POSTGRES_PASSWORD` por uma senha forte.
3. Suba o banco:

```bash
docker compose up -d postgres
```

4. Configure `server/.env` na API:

```bash
PORT=3000
DATABASE_URL=postgres://veganland:SENHA_FORTE@localhost:5432/veganland
ANTHROPIC_API_KEY=sk-ant-...
APP_API_KEY=um-segredo-para-o-app
```

5. Rode migração e API:

```bash
npm install
npm run db:migrate
npm start
```

6. Coloque a API atrás de HTTPS com Nginx, Caddy ou o proxy do seu provedor.
7. No app, configure:

```bash
EXPO_PUBLIC_API_URL=https://api.seudominio.com
EXPO_PUBLIC_APP_API_KEY=um-segredo-para-o-app
```

Não exponha a porta `5432` do PostgreSQL para a internet. O banco deve ficar acessível apenas pela API.

## 📚 Estrutura do Projeto

```
src/
  ├── screens/         # Telas do app
  ├── context/         # State management (React Context)
  ├── services/        # Claude API integration
  ├── i18n/           # Português + Inglês
  ├── constants/      # Cores, dietas, alergias
  └── navigation/     # Navegação entre telas
server/
  ├── src/server.js   # API HTTP
  ├── src/analyze.js  # Pipeline de análise
  ├── src/db.js       # PostgreSQL
  └── src/schema.sql  # Tabelas
```

## 🛠️ Desenvolvimento

Modificar código, salvar, e a mudança aparece automaticamente no app (Hot Reload).

## 📞 Troubleshooting

**"A URL da API não está configurada"**
- Verificar `EXPO_PUBLIC_API_URL` no `.env` da raiz

**"API retorna erro"**
- Verificar `server/.env`
- Rodar `npm run server:migrate`
- Testar `GET /health` no servidor

**"Câmera não funciona"**
- Abrir Configurações do dispositivo
- Permitir acesso à câmera para o app Expo Go

**"Não consegue ler ingredientes"**
- Tirar foto mais próxima do rótulo
- Garantir que está bem iluminado e legível

## 🎯 Próximos Passos (Ideias de Features)

- [ ] Histórico de produtos escaneados
- [ ] Compartilhar análises com amigos
- [ ] Database de produtos já analisados
- [ ] Notificações sobre recalls de produtos
- [ ] Suporte a código de barras (ler automaticamente)
- [ ] Integração com supermercados (preço, localização)

## 📄 Licença

Aberto. Sinta-se livre para modificar e compartilhar!

---

**Dúvidas?** Estou aqui para ajudar. É seu primeiro app, então qualquer coisa pode ser ajustada! 🌱
