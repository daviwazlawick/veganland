# VeganLand - Setup Instructions

## 🌱 O que é VeganLand?

Um app que permite aos usuários:
1. **Criar um perfil** com suas preferências dietéticas (vegan, vegetariano, etc) e alergias
2. **Fotografar produtos** no supermercado
3. **Buscar ingredientes** na imagem, cache local ou Open Food Facts
4. **Receber análise instantânea** via IA se o produto é seguro para seu perfil

## 📋 Requisitos

- **Node.js** 18+ instalado
- **Expo CLI**: `npm install -g expo-cli`
- **Claude API Key**: de https://console.anthropic.com

## 🚀 Setup Inicial

### 1. Obter API Key da Anthropic

1. Vá para https://console.anthropic.com
2. Crie uma conta (grátis)
3. Gere uma nova API key
4. Copie a chave (começa com `sk-ant-`)

### 2. Configurar a API Key do App

Crie um arquivo `.env` na raiz do projeto:

```
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```

Substitua `sk-ant-...` pela sua chave real. Essa chave será usada pelo app para todos os usuários.

### 3. Rodar o App

```bash
npm start
```

Isso abrirá o Expo CLI. Você terá opções:

- **iOS**: Pressione `i` (precisa do Simulator instalado)
- **Android**: Pressione `a` (precisa do Android Studio/Emulator)
- **Físico**: Instale o app Expo Go no seu iPhone/Android, escaneie o QR code

### 4. Primeiro Uso

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

- Sua API key é configurada pelo dono do app via `.env`
- O cache de ingredientes fica local no dispositivo nesta versão
- Suas fotos são **analisadas mas não armazenadas** pela Claude
- Seu perfil é **local** no seu dispositivo

## 📚 Estrutura do Projeto

```
src/
  ├── screens/         # Telas do app
  ├── context/         # State management (React Context)
  ├── services/        # Claude API integration
  ├── i18n/           # Português + Inglês
  ├── constants/      # Cores, dietas, alergias
  └── navigation/     # Navegação entre telas
```

## 🛠️ Desenvolvimento

Modificar código, salvar, e a mudança aparece automaticamente no app (Hot Reload).

## 📞 Troubleshooting

**"API key inválida"**
- Verificar se começa com `sk-ant-`
- Ir em console.anthropic.com e gerar nova chave

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
