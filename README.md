# 🎯 Stranger Chat

Uma plataforma completa de chat anônimo com estranhos em tempo real, incluindo chat de texto e vídeo.

## ✨ Características

- **Chat de Texto**: Conecte-se com pessoas aleatórias através de mensagens
- **Chat de Vídeo**: Conecte-se com pessoas através de vídeo e áudio em tempo real
- **100% Anônimo**: Nenhuma informação pessoal é coletada ou armazenada
- **Tempo Real**: Comunicação instantânea usando WebSockets e WebRTC
- **Interface Moderna**: Design responsivo e intuitivo
- **Botão "Próximo"**: Pule para conversar com outra pessoa facilmente
- **Sem Registro**: Comece a conversar imediatamente

## 🚀 Como Usar

### Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd stranger-chat

# Instale as dependências
npm install

# Inicie o servidor
npm start
```

### Desenvolvimento

```bash
# Modo desenvolvimento com auto-reload
npm run dev

# Executar testes
npm test
```

## 📱 Como Funciona

### Chat de Texto (`/chat`)
1. **Iniciar Chat**: Clique no botão "Iniciar Chat" para começar
2. **Procurando**: O sistema procura alguém online para conversar
3. **Conectado**: Quando encontrar alguém, você pode começar a conversar
4. **Próximo**: Use o botão "Próximo" para conversar com outra pessoa
5. **Parar**: Use o botão "Parar" para encerrar a sessão

### Chat de Vídeo (`/video-chat`)
1. **Permitir Acesso**: Autorize o acesso à câmera e microfone
2. **Iniciar Vídeo**: Clique em "Iniciar Vídeo" para começar
3. **Procurando**: O sistema procura alguém online para conversar
4. **Conectado**: Quando encontrar alguém, o vídeo e áudio serão ativados
5. **Chat**: Você pode conversar por texto enquanto faz vídeo
6. **Próximo**: Use o botão "Próximo" para conversar com outra pessoa

## 🛠️ Tecnologias

- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: HTML5 + CSS3 + JavaScript Vanilla
- **Comunicação**: WebSockets em tempo real
- **Vídeo**: WebRTC para comunicação P2P
- **Estilo**: CSS customizado com gradientes e animações

## 📊 API Endpoints

- `GET /` - Página inicial com menu
- `GET /chat` - Chat de texto
- `GET /video-chat` - Chat de vídeo
- `GET /health` - Status do servidor
- `GET /api/stats` - Estatísticas em tempo real

## 🔧 Estrutura do Projeto

```
stranger-chat/
├── src/
│   ├── OmegleServer.js    # Servidor principal
│   └── config/
│       └── logger.js      # Configuração de logs
├── public/
│   ├── index.html         # Página inicial com menu
│   ├── chat.html          # Chat de texto
│   ├── video-chat.html    # Chat de vídeo
│   └── js/
│       ├── omegle.js      # Lógica do chat de texto
│       └── video-chat.js  # Lógica do chat de vídeo
├── index.js               # Ponto de entrada
└── package.json
```

## 🎨 Interface

- **Página Inicial**: Menu elegante para escolher entre chat de texto e vídeo
- **Chat de Texto**: Interface limpa com mensagens em tempo real
- **Chat de Vídeo**: Layout com vídeos lado a lado e chat integrado
- **Design Responsivo**: Funciona perfeitamente em desktop e mobile
- **Animações Suaves**: Transições e efeitos visuais modernos

## 🔒 Segurança

- Chat completamente anônimo
- Sem armazenamento de mensagens
- Conexões temporárias
- Sem necessidade de registro
- WebRTC P2P para vídeo (sem servidor intermediário)

## 🚀 Deploy

### Local
```bash
npm start
```

### Produção
```bash
# Configure a variável PORT se necessário
PORT=3000 npm start
```

## 📝 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um fork do projeto
2. Criar uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abrir um Pull Request

## 📞 Suporte

Se você encontrar algum problema ou tiver sugestões, abra uma issue no GitHub.

---

**Divirta-se conversando com estranhos! 🎉** 