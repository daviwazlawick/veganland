# 🌱 VeganLand

Um app inteligente para verificar se produtos alimentícios são seguros para **sua dieta e alergias**.

Tire uma foto do rótulo → IA analisa → Você sabe se é seguro ✅

---

## 🚀 Quick Start

```bash
npm install
npm run server:install
npm run deploy:up
npm run deploy:migrate
npm start
```

Pressione `i` (iOS), `a` (Android), ou escaneie o QR com Expo Go.

Antes de rodar o app, configure a URL da API no `.env` da raiz:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_APP_API_KEY=change-this-shared-secret
```

A chave da Anthropic fica no backend, em `server/.env`.
Veja [server/README.md](./server/README.md) para o PostgreSQL proprio.

---

## ⚙️ Setup Detalhado

Veja [SETUP.md](./SETUP.md) para instruções completas:
- Como obter API key
- Como rodar no seu telefone
- Troubleshooting
- Ideias de features

---

## 🎯 Features

✅ Criar perfil com dieta e alergias
✅ Fotografar produto (câmera ou galeria)  
✅ Análise via Claude IA
✅ Resultado: SEGURO / ATENÇÃO / EVITAR
✅ Bilíngue: Português + Inglês
✅ Histórico de produtos escaneados

---

## 📱 Como Funciona

1. **Perfil**: Escolha sua dieta (vegan, vegetariano, etc) + alergias
2. **Foto**: Tire uma foto do rótulo/ingredientes
3. **Identificação**: IA identifica produto e ingredientes visíveis
4. **Busca/Cache**: Se não houver ingredientes na foto, o backend consulta o banco central e Open Food Facts
5. **Resultado**: App mostra se é seguro para você
6. **Histórico**: Vê produtos já escaneados

---

## 🏗️ Arquitetura

- **React Native + Expo** - Cross-platform (iOS/Android)
- **React Navigation** - Navegação
- **React Context** - State management
- **Node API** - Backend central para IA, cache e busca
- **PostgreSQL** - Banco central de produtos e análises
- **Claude API** - IA para análise no servidor
- **AsyncStorage** - Persistência local
- **Open Food Facts** - Busca pública de ingredientes quando a foto não mostra a lista
- **expo-camera** - Câmera
- **expo-image-picker** - Galeria

---

## 🔐 Privacidade

- Chave Anthropic fica só no backend
- Perfil é **local**, não sincroniza
- Produtos e análises ficam no banco central
- Fotos são **analisadas mas não armazenadas** pela IA

---

## 💡 Stack

- Node 18+
- PostgreSQL
- Expo CLI
- React 19 + React Native 0.81
- TypeScript (opcional)

---

## 📝 Próximas Ideias

- Código de barras automático
- Database de produtos
- Compartilhar com amigos
- Notificações de recalls

---

**É seu primeiro app?** Parabéns! 🎉 Qualquer coisa pode ser ajustada, refatorada, ou melhorada. Estou aqui pra ajudar! 🌱
