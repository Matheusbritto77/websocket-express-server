# 🎯 Stranger Chat - Servidor WebSocket Avançado

Uma plataforma completa de chat anônimo com estranhos em tempo real, incluindo chat de texto e vídeo, com suporte a Redis, MongoDB e PostgreSQL.

## ✨ Características

- **Chat de Texto**: Conecte-se com pessoas aleatórias através de mensagens
- **Chat de Vídeo**: Conecte-se com pessoas através de vídeo e áudio em tempo real
- **100% Anônimo**: Nenhuma informação pessoal é coletada ou armazenada
- **Tempo Real**: Comunicação instantânea usando WebSockets e WebRTC
- **Interface Moderna**: Design responsivo e intuitivo
- **Botão "Próximo"**: Pule para conversar com outra pessoa facilmente
- **Sem Registro**: Comece a conversar imediatamente
- **Cache Redis**: Performance otimizada com cache em memória
- **Persistência MongoDB**: Histórico de conversas e estatísticas
- **PostgreSQL**: Sistema de usuários registrados (futuro)
- **Rate Limiting**: Proteção contra spam e abuso
- **Monitoramento**: Estatísticas em tempo real e health checks

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
- **Cache**: Redis para performance e filas
- **Banco de Dados**: MongoDB + PostgreSQL
- **Frontend**: HTML5 + CSS3 + JavaScript Vanilla
- **Comunicação**: WebSockets em tempo real
- **Vídeo**: WebRTC para comunicação P2P
- **Logging**: Winston para logs estruturados
- **Rate Limiting**: Proteção contra spam

## 📋 Pré-requisitos

- Node.js (v14 ou superior)
- Redis Server
- MongoDB
- PostgreSQL (opcional para futuras funcionalidades)

## 📊 API Endpoints

### HTTP Endpoints
- `GET /` - Página inicial com menu
- `GET /chat` - Chat de texto
- `GET /video-chat` - Chat de vídeo
- `GET /health` - Status do servidor e bancos de dados
- `GET /api/stats` - Estatísticas em tempo real (com cache Redis)
- `GET /api/online` - Usuários online
- `GET /api/users` - Lista de usuários (MongoDB)
- `GET /api/rooms` - Lista de salas de chat (MongoDB)

### WebSocket Events
**Cliente → Servidor:**
- `join_chat` - Entrar em um chat
- `message` - Enviar mensagem
- `offer` - WebRTC offer
- `answer` - WebRTC answer
- `candidate` - WebRTC candidate
- `next` - Próximo usuário

**Servidor → Cliente:**
- `status` - Status da conexão
- `message` - Mensagem recebida
- `message_sent` - Confirmação de mensagem
- `partner_left` - Parceiro desconectou
- `online_count` - Contagem de usuários online

## 🗄️ Banco de Dados

### Redis
- **Cache de estatísticas**: Performance otimizada
- **Fila de espera**: Usuários aguardando match
- **Usuários online**: Contagem em tempo real
- **Rate limiting**: Proteção contra spam
- **Mensagens temporárias**: Cache de mensagens recentes
- **TTL automático**: Limpeza de dados expirados

### MongoDB
- **Usuários**: Histórico e estatísticas
- **Salas de chat**: Conversas e metadados
- **WebRTC**: Offers, answers e candidates
- **Logs de atividade**: Auditoria
- **Índices otimizados**: Performance de queries

### PostgreSQL (Futuro)
- **Usuários registrados**: Sistema de contas
- **Sessões**: Gerenciamento de login
- **Relatórios**: Sistema de denúncias
- **Configurações**: Configurações do sistema
- **Logs de auditoria**: Rastreamento detalhado

## 🔧 Estrutura do Projeto

```
stranger-chat/
├── src/
│   ├── config/
│   │   ├── database.js      # Configurações dos bancos de dados
│   │   └── logger.js        # Configuração de logs
│   ├── models/
│   │   ├── User.js          # Modelo MongoDB para usuários
│   │   └── ChatRoom.js      # Modelo MongoDB para salas de chat
│   ├── services/
│   │   ├── RedisService.js  # Serviço Redis para cache e filas
│   │   └── PostgreSQLService.js # Serviço PostgreSQL (futuro)
│   └── OmegleServer.js      # Servidor principal
├── public/
│   ├── index.html           # Página inicial
│   ├── chat.html            # Chat de texto
│   ├── video-chat.html      # Chat de vídeo
│   ├── css/
│   └── js/
├── logs/                    # Arquivos de log
├── index.js                 # Ponto de entrada
└── package.json
```

## 🔒 Segurança

- **Rate Limiting**: Proteção contra spam (10 conexões/min, 60 mensagens/min)
- **Validação de entrada**: Sanitização de dados
- **TTL automático**: Limpeza de dados expirados
- **Logs de auditoria**: Rastreamento de atividades
- **Chat anônimo**: Sem armazenamento de informações pessoais
- **Conexões temporárias**: Dados expiram automaticamente

## 📊 Monitoramento

- **Health Check**: `/health` - Status de todos os serviços
- **Estatísticas**: `/api/stats` - Métricas em tempo real
- **Logs**: Arquivos estruturados em `./logs/`
- **Métricas Redis**: Cache hit/miss e performance
- **Métricas MongoDB**: Performance de queries e conexões
- **Graceful Shutdown**: Encerramento limpo do servidor

## 🚀 Deploy

### Local
```bash
npm start
```

### Docker
```bash
# Build da imagem
docker build -t omegle-clone .

# Executar container
docker run -p 3000:3000 --env-file .env omegle-clone
```

### PM2 (Produção)
```bash
# Instalar PM2
npm install -g pm2

# Executar com PM2
pm2 start index.js --name "omegle-clone"

# Monitorar
pm2 monit
```

## 🎨 Interface

- **Página Inicial**: Menu elegante para escolher entre chat de texto e vídeo
- **Chat de Texto**: Interface limpa com mensagens em tempo real
- **Chat de Vídeo**: Layout com vídeos lado a lado e chat integrado
- **Design Responsivo**: Funciona perfeitamente em desktop e mobile
- **Animações Suaves**: Transições e efeitos visuais modernos
- **Contador Online**: Widget em tempo real com Redis

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

Se você encontrar algum problema ou tiver sugestões:

1. Verifique os logs em `./logs/`
2. Teste a conexão com os bancos de dados
3. Verifique as configurações no arquivo `.env`
4. Abra uma issue no GitHub

## 🔄 Changelog

### v2.0.0
- ✅ Integração completa com Redis
- ✅ Persistência MongoDB
- ✅ Sistema de rate limiting
- ✅ Cache de estatísticas
- ✅ Health checks avançados
- ✅ Logs estruturados
- ✅ Graceful shutdown
- ✅ Monitoramento em tempo real

### v1.0.0
- ✅ Chat de texto em tempo real
- ✅ Chat de vídeo com WebRTC
- ✅ Sistema de fila automática
- ✅ Interface responsiva

---

**Divirta-se conversando com estranhos! 🎉** 