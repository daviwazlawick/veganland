# 🌱 VeganLand

Um app inteligente para verificar se produtos alimentícios são seguros para **sua dieta e alergias**.

Tire uma foto do rótulo → IA analisa → Você sabe se é seguro ✅

---

## 🚀 Quick Start

```bash
npm install
npm start
```

Pressione `i` (iOS), `a` (Android), ou escaneie o QR com Expo Go.

**Depois:** Configure sua API key no app (Perfil → API Key)

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
3. **Análise**: Claude IA lê os ingredientes
4. **Resultado**: App mostra se é seguro para você
5. **Histórico**: Vê produtos já escaneados

---

## 🏗️ Arquitetura

- **React Native + Expo** - Cross-platform (iOS/Android)
- **React Navigation** - Navegação
- **React Context** - State management
- **Claude API** - IA para análise
- **AsyncStorage** - Persistência local
- **expo-camera** - Câmera
- **expo-image-picker** - Galeria

---

## 🔐 Privacidade

- API key fica **só no seu dispositivo**
- Perfil é **local**, não sincroniza
- Fotos são **analisadas mas não armazenadas** pela IA

---

## 💡 Stack

- Node 18+
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
