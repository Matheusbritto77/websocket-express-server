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
- **Mensagens dos Grupos**: Histórico das últimas 24 horas
- **TTL Automático**: Expiração automática após 24 horas
- **Índices Otimizados**: Para consultas rápidas por grupo e período
- **Estatísticas**: Contadores de mensagens por período

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

# 🎯 Stranger Chat - Servidor WebSocket com Express

Um servidor completo de chat anônimo estilo Omegle com chat de texto, vídeo e grupos públicos, construído com Node.js, Express, Socket.IO, Redis, MongoDB e PostgreSQL.

## 🚀 Funcionalidades

### Chat Anônimo
- **Chat de Texto**: Conecte-se com estranhos aleatoriamente
- **Chat de Vídeo**: Conversas com vídeo e áudio em tempo real
- **Sistema de Espera**: Fila inteligente para conectar usuários
- **Botão "Próximo"**: Pule para o próximo usuário facilmente

### Grupos Públicos
- **Criação de Grupos**: Usuários registrados podem criar grupos temáticos
- **Chat em Grupo**: Mensagens de texto em tempo real
- **Histórico de 24h**: Mensagens salvas no MongoDB com TTL automático
- **Gerenciamento**: Admins podem editar nome, descrição e excluir grupos
- **Participação**: Usuários registrados e anônimos podem participar
- **Identificação**: Usuários registrados mostram nome, anônimos mostram "Stranger"

### Sistema de Autenticação
- **Registro e Login**: Sistema completo de autenticação
- **Sessões Persistentes**: Sessões armazenadas no PostgreSQL
- **Perfil de Usuário**: Dados pessoais e histórico de login
- **Segurança**: Senhas criptografadas com bcrypt

### Estatísticas em Tempo Real
- **Contador Online**: Widget com usuários online
- **Estatísticas Detalhadas**: Usuários em espera, conversas ativas
- **Persistência**: Dados salvos no Redis

## 🛠️ Tecnologias

- **Backend**: Node.js, Express
- **WebSocket**: Socket.IO
- **Cache**: Redis
- **Banco Principal**: PostgreSQL
- **Banco Secundário**: MongoDB (opcional)
- **Frontend**: HTML5, CSS3, JavaScript
- **Segurança**: bcrypt, JWT

## 📋 Pré-requisitos

- Node.js 16+
- Redis
- PostgreSQL
- MongoDB (opcional)

## ⚙️ Instalação

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd websocket-express-server
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp config.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
# Servidor
PORT=3333
NODE_ENV=development

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua_senha
POSTGRES_DB=stranger_chat
POSTGRES_SSL=false

# MongoDB (opcional)
MONGO_URL=mongodb://localhost:27017/stranger_chat
MONGO_PASSWORD=Setcel2@@

# Logs
LOG_LEVEL=info
```

4. **Inicie os serviços**
```bash
# Redis
redis-server

# PostgreSQL
# Certifique-se de que o PostgreSQL está rodando

# MongoDB (opcional)
mongod
```

5. **Execute o servidor**
```bash
npm start
```

## 🗄️ Estrutura do Banco de Dados

### PostgreSQL (Principal)

#### Tabela `users`
- Armazena dados dos usuários registrados
- Username, email, senha criptografada
- Dados de perfil em JSONB

#### Tabela `sessions`
- Sessões ativas dos usuários
- Token de sessão, socket_id
- Controle de expiração

#### Tabela `login_history`
- Histórico de tentativas de login
- IP, user agent, sucesso/falha

#### Tabela `public_groups`
- Grupos públicos criados pelos usuários
- Nome, descrição, criador
- Contadores de membros e mensagens

#### Tabela `group_members`
- Membros dos grupos
- Relacionamento usuário-grupo
- Controle de admin

#### Tabela `group_messages`
- Mensagens dos grupos
- Identificação de usuários registrados vs anônimos

### Redis (Cache)
- Contadores de usuários online
- Filas de espera para chat
- Cache de sessões ativas

### MongoDB (Opcional)
- Logs de conversas
- Estatísticas detalhadas
- Dados de analytics

## 🔌 APIs

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Fazer login
- `POST /api/auth/validate` - Validar sessão
- `POST /api/auth/logout` - Fazer logout
- `GET /api/auth/profile` - Obter perfil
- `PUT /api/auth/profile` - Atualizar perfil
- `GET /api/auth/login-history` - Histórico de login

### Grupos Públicos
- `GET /api/groups` - Listar grupos
- `POST /api/groups` - Criar grupo (usuários registrados)
- `GET /api/groups/:id` - Obter detalhes do grupo
- `PUT /api/groups/:id` - Editar grupo (admin)
- `DELETE /api/groups/:id` - Excluir grupo (admin)
- `POST /api/groups/:id/join` - Entrar no grupo
- `POST /api/groups/:id/leave` - Sair do grupo
- `GET /api/groups/:id/messages` - Mensagens do grupo (últimas 24h)
- `GET /api/groups/:id/messages/history` - Histórico por período
- `GET /api/groups/:id/messages/stats` - Estatísticas de mensagens
- `GET /api/groups/:id/members` - Membros do grupo

### Estatísticas
- `GET /api/stats/online` - Estatísticas online

## 📡 Eventos Socket.IO

### Chat Anônimo
- `find_partner` - Procurar parceiro
- `next` - Próximo usuário
- `message` - Enviar mensagem
- `disconnect` - Desconectar

### Grupos Públicos
- `join_group` - Entrar em grupo
- `leave_group` - Sair do grupo
- `group_message` - Mensagem no grupo
- `create_group` - Criar grupo

## 🎨 Páginas

- `/` - Página principal
- `/chat` - Chat de texto
- `/video-chat` - Chat de vídeo
- `/groups` - Lista de grupos públicos
- `/group/:id` - Chat do grupo
- `/login` - Login/Registro
- `/profile` - Perfil do usuário

## 🔒 Segurança

- **Senhas**: Criptografadas com bcrypt
- **Sessões**: Tokens JWT seguros
- **Validação**: Input sanitization
- **Rate Limiting**: Proteção contra spam
- **HTTPS**: Recomendado para produção

## 📊 Monitoramento

- **Logs**: Winston com rotação
- **Métricas**: Estatísticas em tempo real
- **Erros**: Tratamento robusto de exceções
- **Performance**: Otimizações de banco

## 🚀 Deploy

### Produção
```bash
NODE_ENV=production npm start
```

### Docker (opcional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3333
CMD ["npm", "start"]
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Para suporte, abra uma issue no GitHub ou entre em contato através do email.

---

**Desenvolvido com ❤️ para conectar pessoas de forma segura e anônima.** 