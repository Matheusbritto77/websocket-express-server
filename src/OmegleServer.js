const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const logger = require('./config/logger');
const redisService = require('./services/RedisService');
const postgresService = require('./services/PostgreSQLService');
const User = require('./models/User');
const ChatRoom = require('./models/ChatRoom');

class OmegleServer {
    constructor(port = 3000) {
        this.port = port;
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        // Filas separadas para chat de texto e chat com vídeo
        this.textChatWaitingUsers = [];
        this.videoChatWaitingUsers = [];
        
        // Conexões ativas separadas por tipo
        this.textChatConnections = new Map(); // socketId -> { partnerId, roomId, type: 'text' }
        this.videoChatConnections = new Map(); // socketId -> { partnerId, roomId, type: 'video' }
        
        // Mapeamento de socket para tipo de chat
        this.socketChatType = new Map(); // socketId -> 'text' | 'video'
        
        // Contador de usuários online
        this.onlineUsers = new Set(); // socketId -> true
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketHandlers();
        
        // Inicializar serviços
        this.initializeServices();
    }

    async initializeServices() {
        try {
            console.log('🔄 Inicializando serviços do OmegleServer...');
            
            // Inicializar Redis Service (obrigatório)
            await redisService.initialize();
            console.log('✅ Redis Service inicializado');
            
            // Inicializar PostgreSQL Service (opcional)
            try {
                await postgresService.initialize();
                console.log('✅ PostgreSQL Service inicializado');
            } catch (postgresError) {
                console.log('⚠️ PostgreSQL não disponível:', postgresError.message);
                console.log('ℹ️ Sistema funcionará sem autenticação de usuários');
            }
            
            // Configurar limpeza periódica de dados
            setInterval(async () => {
                await redisService.cleanupExpiredData();
                try {
                    await postgresService.cleanupExpiredSessions();
                } catch (error) {
                    // Ignorar erros de PostgreSQL
                }
            }, 300000); // A cada 5 minutos
            
            // Configurar broadcast periódico das estatísticas online
            setInterval(async () => {
                await this.broadcastOnlineCount();
            }, 10000); // A cada 10 segundos
            
            console.log('✅ Todos os serviços inicializados com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar serviços:', error);
        }
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, '../public')));
    }

    // Middleware para validar sessão
    async validateSession(req, res, next) {
        try {
            // Verificar se PostgreSQL está disponível
            if (!postgresService.pool) {
                return res.status(503).json({ 
                    error: 'Sistema de autenticação indisponível',
                    message: 'PostgreSQL não está conectado'
                });
            }

            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Token de autenticação necessário' });
            }

            const sessionToken = authHeader.substring(7);
            const session = await postgresService.validateSession(sessionToken);
            
            if (!session) {
                return res.status(401).json({ error: 'Sessão inválida ou expirada' });
            }

            req.user = session;
            next();
        } catch (error) {
            logger.error('Erro ao validar sessão:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', async (req, res) => {
            try {
                const redisHealth = await redisService.healthCheck();
                const stats = await this.getOnlineStats();
                
                res.json({ 
                    status: 'UP', 
                    timestamp: new Date().toISOString(),
                    redis: redisHealth ? 'connected' : 'disconnected',
                    textChatWaitingUsers: this.textChatWaitingUsers.length,
                    videoChatWaitingUsers: this.videoChatWaitingUsers.length,
                    textChatConnections: this.textChatConnections.size,
                    videoChatConnections: this.videoChatConnections.size,
                    onlineUsers: stats.onlineCount
                });
            } catch (error) {
                res.status(500).json({ 
                    status: 'ERROR', 
                    error: error.message 
                });
            }
        });

        // Página inicial
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });

        // Chat de texto
        this.app.get('/chat', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/chat.html'));
        });

        // Chat de vídeo
        this.app.get('/video-chat', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/video-chat.html'));
        });

        // Teste do contador online
        this.app.get('/test-online', (req, res) => {
            res.sendFile(path.join(__dirname, '../test-online-counter.html'));
        });

        // Estatísticas
        this.app.get('/api/stats', async (req, res) => {
            try {
                // Tentar obter estatísticas do cache Redis
                let stats = await redisService.getCachedStats();
                
                if (!stats) {
                    // Se não há cache, calcular estatísticas
                    stats = {
                        textChat: {
                            waitingUsers: this.textChatWaitingUsers.length,
                            activeConnections: this.textChatConnections.size
                        },
                        videoChat: {
                            waitingUsers: this.videoChatWaitingUsers.length,
                            activeConnections: this.videoChatConnections.size
                        },
                        onlineUsers: await redisService.getOnlineCount(),
                        timestamp: new Date().toISOString()
                    };
                    
                    // Cachear estatísticas por 5 minutos
                    await redisService.cacheStats(stats);
                }
                
                res.json(stats);
            } catch (error) {
                logger.error('Erro ao obter estatísticas:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });

        // Estatísticas de usuários online
        this.app.get('/api/online', async (req, res) => {
            try {
                const stats = await this.getOnlineStats();
                res.json({
                    totalOnline: stats.onlineCount,
                    textChatWaiting: stats.textWaiting,
                    videoChatWaiting: stats.videoWaiting,
                    textActive: stats.textActive,
                    videoActive: stats.videoActive,
                    timestamp: stats.timestamp
                });
            } catch (error) {
                logger.error('Erro ao obter estatísticas online:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });

        // API para obter dados do MongoDB
        this.app.get('/api/users', async (req, res) => {
            try {
                const databaseManager = require('./config/database');
                const mongoConnection = databaseManager.getMongoConnection();
                
                if (!mongoConnection) {
                    return res.status(503).json({ 
                        error: 'MongoDB não disponível',
                        message: 'Serviço temporariamente indisponível'
                    });
                }
                
                const users = await User.find().limit(100).sort({ createdAt: -1 });
                res.json(users);
            } catch (error) {
                logger.error('Erro ao buscar usuários:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });

        this.app.get('/api/rooms', async (req, res) => {
            try {
                const databaseManager = require('./config/database');
                const mongoConnection = databaseManager.getMongoConnection();
                
                if (!mongoConnection) {
                    return res.status(503).json({ 
                        error: 'MongoDB não disponível',
                        message: 'Serviço temporariamente indisponível'
                    });
                }
                
                const rooms = await ChatRoom.find().limit(100).sort({ createdAt: -1 });
                res.json(rooms);
            } catch (error) {
                logger.error('Erro ao buscar salas:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });

        // Rotas de autenticação
        this.app.get('/login', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/login.html'));
        });

        this.app.get('/profile', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/profile.html'));
        });

        // API de registro
        this.app.post('/api/auth/register', async (req, res) => {
            try {
                // Verificar se PostgreSQL está disponível
                if (!postgresService.pool) {
                    return res.status(503).json({ 
                        error: 'Sistema de autenticação indisponível',
                        message: 'PostgreSQL não está conectado'
                    });
                }

                const { username, email, password } = req.body;

                // Validações básicas
                if (!username || !email || !password) {
                    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
                }

                if (username.length < 3 || username.length > 20) {
                    return res.status(400).json({ error: 'Nome de usuário deve ter entre 3 e 20 caracteres' });
                }

                if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                    return res.status(400).json({ error: 'Nome de usuário deve conter apenas letras, números e _' });
                }

                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    return res.status(400).json({ error: 'Email inválido' });
                }

                if (password.length < 6) {
                    return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
                }

                // Criar usuário
                const user = await postgresService.createUser(username, email, password);
                
                // Criar sessão
                const sessionToken = await postgresService.createSession(
                    user.id, 
                    null, 
                    req.headers['user-agent'], 
                    req.ip
                );

                // Registrar tentativa de login
                await postgresService.logLoginAttempt(
                    user.id, 
                    req.ip, 
                    req.headers['user-agent'], 
                    true
                );

                res.json({
                    success: true,
                    message: 'Conta criada com sucesso',
                    sessionToken,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email
                    }
                });
            } catch (error) {
                logger.error('Erro no registro:', error);
                if (error.message === 'Usuário ou email já existe') {
                    res.status(400).json({ error: error.message });
                } else {
                    res.status(500).json({ error: 'Erro interno do servidor' });
                }
            }
        });

        // API de login
        this.app.post('/api/auth/login', async (req, res) => {
            try {
                // Verificar se PostgreSQL está disponível
                if (!postgresService.pool) {
                    return res.status(503).json({ 
                        error: 'Sistema de autenticação indisponível',
                        message: 'PostgreSQL não está conectado'
                    });
                }

                const { username, password } = req.body;

                if (!username || !password) {
                    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
                }

                // Autenticar usuário
                const user = await postgresService.authenticateUser(username, password);
                
                if (!user) {
                    // Tentar encontrar usuário para registrar falha
                    try {
                        const existingUser = await postgresService.pool.query(
                            'SELECT id FROM users WHERE username = $1 OR email = $1',
                            [username]
                        );
                        
                        if (existingUser.rows.length > 0) {
                            await postgresService.logLoginAttempt(
                                existingUser.rows[0].id,
                                req.ip,
                                req.headers['user-agent'],
                                false,
                                'Senha incorreta'
                            );
                        }
                    } catch (logError) {
                        // Ignorar erros de log
                    }
                    
                    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
                }

                // Criar sessão
                const sessionToken = await postgresService.createSession(
                    user.id, 
                    null, 
                    req.headers['user-agent'], 
                    req.ip
                );

                // Registrar tentativa de login
                await postgresService.logLoginAttempt(
                    user.id, 
                    req.ip, 
                    req.headers['user-agent'], 
                    true
                );

                res.json({
                    success: true,
                    message: 'Login realizado com sucesso',
                    sessionToken,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email
                    }
                });
            } catch (error) {
                logger.error('Erro no login:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });

        // API de validação de sessão
        this.app.post('/api/auth/validate', async (req, res) => {
            try {
                // Verificar se PostgreSQL está disponível
                if (!postgresService.pool) {
                    return res.status(503).json({ 
                        error: 'Sistema de autenticação indisponível',
                        message: 'PostgreSQL não está conectado'
                    });
                }

                const { sessionToken } = req.body;
                
                if (!sessionToken) {
                    return res.status(400).json({ error: 'Token de sessão necessário' });
                }

                const session = await postgresService.validateSession(sessionToken);
                
                if (!session) {
                    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
                }

                res.json({ valid: true, user: session });
            } catch (error) {
                logger.error('Erro ao validar sessão:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });

        // API de logout
        this.app.post('/api/auth/logout', this.validateSession.bind(this), async (req, res) => {
            try {
                // Verificar se PostgreSQL está disponível
                if (!postgresService.pool) {
                    return res.status(503).json({ 
                        error: 'Sistema de autenticação indisponível',
                        message: 'PostgreSQL não está conectado'
                    });
                }

                const authHeader = req.headers.authorization;
                const sessionToken = authHeader.substring(7);
                
                await postgresService.invalidateSession(sessionToken);
                
                res.json({ success: true, message: 'Logout realizado com sucesso' });
            } catch (error) {
                logger.error('Erro no logout:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });

        // API de perfil do usuário
        this.app.get('/api/auth/profile', this.validateSession.bind(this), async (req, res) => {
            try {
                // Verificar se PostgreSQL está disponível
                if (!postgresService.pool) {
                    return res.status(503).json({ 
                        error: 'Sistema de autenticação indisponível',
                        message: 'PostgreSQL não está conectado'
                    });
                }

                const user = await postgresService.getUserById(req.user.user_id);
                
                if (!user) {
                    return res.status(404).json({ error: 'Usuário não encontrado' });
                }

                res.json(user);
            } catch (error) {
                logger.error('Erro ao buscar perfil:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });

        // API de atualização de perfil
        this.app.put('/api/auth/profile', this.validateSession.bind(this), async (req, res) => {
            try {
                // Verificar se PostgreSQL está disponível
                if (!postgresService.pool) {
                    return res.status(503).json({ 
                        error: 'Sistema de autenticação indisponível',
                        message: 'PostgreSQL não está conectado'
                    });
                }

                const profileData = req.body;
                const user = await postgresService.updateUserProfile(req.user.user_id, profileData);
                
                res.json(user);
            } catch (error) {
                logger.error('Erro ao atualizar perfil:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });

        // API de histórico de login
        this.app.get('/api/auth/login-history', this.validateSession.bind(this), async (req, res) => {
            try {
                // Verificar se PostgreSQL está disponível
                if (!postgresService.pool) {
                    return res.status(503).json({ 
                        error: 'Sistema de autenticação indisponível',
                        message: 'PostgreSQL não está conectado'
                    });
                }

                const history = await postgresService.getLoginHistory(req.user.user_id, 10);
                res.json(history);
            } catch (error) {
                logger.error('Erro ao buscar histórico:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            logger.info(`Nova conexão: ${socket.id}`);
            
            // Verifica se é uma conexão apenas para estatísticas
            const isStatsOnly = socket.handshake.query.type === 'stats_only';
            
            if (!isStatsOnly) {
                // Adiciona ao contador de usuários online apenas se não for apenas para estatísticas
                this.addOnlineUser(socket.id);
            }
            
            // Evento para definir o tipo de chat
            socket.on('join_chat', (data) => {
                this.handleJoinChat(socket, data);
            });
            
            // Eventos do chat
            socket.on('message', (data) => {
                this.handleMessage(socket, data);
            });
            
            // Eventos WebRTC para chat de vídeo
            socket.on('offer', (data) => {
                this.handleWebRTCOffer(socket, data);
            });
            
            socket.on('answer', (data) => {
                this.handleWebRTCAnswer(socket, data);
            });
            
            socket.on('candidate', (data) => {
                this.handleWebRTCCandidate(socket, data);
            });
            
            // Evento para pular para próximo usuário
            socket.on('next', () => {
                this.handleNext(socket);
            });
            
            // Evento para sair
            socket.on('disconnect', () => {
                this.handleDisconnect(socket, isStatsOnly);
            });
        });
    }

    async handleJoinChat(socket, data) {
        const chatType = data.type; // 'text' ou 'video'
        
        if (chatType !== 'text' && chatType !== 'video') {
            socket.emit('error', { message: 'Tipo de chat inválido' });
            return;
        }
        
        try {
            // Verificar rate limit
            const rateLimitKey = `join_chat:${socket.id}`;
            const isAllowed = await redisService.checkRateLimit(rateLimitKey, 10, 60000); // 10 tentativas por minuto
            
            if (!isAllowed) {
                socket.emit('error', { message: 'Muitas tentativas de conexão. Tente novamente em alguns minutos.' });
                return;
            }
            
            // Define o tipo de chat para este socket
            this.socketChatType.set(socket.id, chatType);
            
            logger.info(`Usuário ${socket.id} entrou no chat ${chatType}`);
            
            // Adiciona à fila apropriada
            await this.addToWaitingQueue(socket, chatType);
            
        } catch (error) {
            logger.error('Erro ao processar join_chat:', error);
            socket.emit('error', { message: 'Erro interno do servidor' });
        }
    }

    async addToWaitingQueue(socket, chatType) {
        try {
            // Adicionar à fila Redis
            await redisService.addToWaitingQueue(socket.id, chatType);
            
            const waitingQueue = chatType === 'text' ? this.textChatWaitingUsers : this.videoChatWaitingUsers;
            
            // Adiciona à fila de espera apenas o id se não estiver presente
            if (!waitingQueue.includes(socket.id)) {
                waitingQueue.push(socket.id);
                logger.info(`Usuário ${socket.id} adicionado à fila de ${chatType}. Total: ${waitingQueue.length}`);
            }

            // Notifica o usuário
            socket.emit('status', { 
                type: 'waiting', 
                message: `Procurando alguém para conversar no chat ${chatType === 'text' ? 'de texto' : 'com vídeo'}...`,
                position: waitingQueue.length,
                chatType: chatType
            });

            // Tenta fazer match
            await this.tryMatch(chatType);
            
        } catch (error) {
            logger.error('Erro ao adicionar à fila de espera:', error);
        }
    }

    async tryMatch(chatType) {
        try {
            const waitingQueue = chatType === 'text' ? this.textChatWaitingUsers : this.videoChatWaitingUsers;
            const connections = chatType === 'text' ? this.textChatConnections : this.videoChatConnections;
            
            // Se há pelo menos 2 usuários esperando, faz o match
            if (waitingQueue.length >= 2) {
                const user1 = waitingQueue.shift();
                const user2 = waitingQueue.shift();
                
                const roomId = `${chatType}_room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Criar sala no Redis
                await redisService.createChatRoom(roomId, user1, user2);
                
                // Criar sala no MongoDB
                try {
                    const chatRoom = new ChatRoom({
                        roomId,
                        user1: { socketId: user1, joinedAt: Date.now() },
                        user2: { socketId: user2, joinedAt: Date.now() },
                        chatType,
                        status: 'active',
                        stats: { startedAt: Date.now() }
                    });
                    await chatRoom.save();
                } catch (mongoError) {
                    console.log('⚠️ MongoDB não disponível para salvar sala:', mongoError.message);
                }
                
                // Cria a conexão
                connections.set(user1, { partnerId: user2, roomId, type: chatType });
                connections.set(user2, { partnerId: user1, roomId, type: chatType });
                
                // Notifica os usuários
                const socket1 = this.io.sockets.sockets.get(user1);
                const socket2 = this.io.sockets.sockets.get(user2);
                
                if (socket1) {
                    socket1.emit('status', { 
                        type: 'connected', 
                        message: `Conectado no chat ${chatType === 'text' ? 'de texto' : 'com vídeo'}! Você pode começar a conversar.`,
                        roomId,
                        partnerId: user2,
                        chatType: chatType
                    });
                }
                
                if (socket2) {
                    socket2.emit('status', { 
                        type: 'connected', 
                        message: `Conectado no chat ${chatType === 'text' ? 'de texto' : 'com vídeo'}! Você pode começar a conversar.`,
                        roomId,
                        partnerId: user1,
                        chatType: chatType
                    });
                }
                
                logger.info(`Match criado: ${user1} e ${user2} no chat ${chatType} (sala: ${roomId})`);
                
                // Remover da fila Redis
                await redisService.removeFromWaitingQueue(user1, chatType);
                await redisService.removeFromWaitingQueue(user2, chatType);
            }
        } catch (error) {
            logger.error('Erro ao tentar fazer match:', error);
        }
    }

    getConnection(socketId) {
        const textConnection = this.textChatConnections.get(socketId);
        if (textConnection) return textConnection;
        
        const videoConnection = this.videoChatConnections.get(socketId);
        if (videoConnection) return videoConnection;
        
        return null;
    }

    async handleMessage(socket, data) {
        try {
            const connection = this.getConnection(socket.id);
            if (!connection) {
                socket.emit('error', { message: 'Você não está em uma conversa ativa' });
                return;
            }
            
            const { text } = data;
            if (!text || text.trim().length === 0) {
                return;
            }
            
            // Verificar rate limit para mensagens
            const rateLimitKey = `messages:${socket.id}`;
            const isAllowed = await redisService.checkRateLimit(rateLimitKey, 60, 60000); // 60 mensagens por minuto
            
            if (!isAllowed) {
                socket.emit('error', { message: 'Muitas mensagens. Aguarde um momento.' });
                return;
            }
            
            const partnerSocket = this.io.sockets.sockets.get(connection.partnerId);
            if (partnerSocket) {
                // Enviar mensagem para o parceiro
                partnerSocket.emit('message', {
                    text: text.trim(),
                    timestamp: Date.now()
                });
                
                // Confirmar recebimento para o remetente
                socket.emit('message_sent', {
                    text: text.trim(),
                    timestamp: Date.now()
                });
                
                // Armazenar mensagem no Redis
                await redisService.storeMessage(connection.roomId, {
                    text: text.trim(),
                    sender: socket.id,
                    timestamp: Date.now()
                });
                
                // Atualizar sala no MongoDB
                try {
                    await ChatRoom.findOneAndUpdate(
                        { roomId: connection.roomId },
                        { 
                            $push: { 
                                messages: {
                                    text: text.trim(),
                                    sender: socket.id,
                                    timestamp: Date.now()
                                }
                            },
                            $inc: { 'stats.messageCount': 1 }
                        }
                    );
                } catch (mongoError) {
                    console.log('⚠️ MongoDB não disponível para salvar mensagem:', mongoError.message);
                }
                
                logger.info(`Mensagem enviada de ${socket.id} para ${connection.partnerId} na sala ${connection.roomId}`);
            } else {
                socket.emit('error', { message: 'Seu parceiro desconectou' });
                this.handleNext(socket);
            }
        } catch (error) {
            logger.error('Erro ao processar mensagem:', error);
            socket.emit('error', { message: 'Erro interno do servidor' });
        }
    }

    async handleWebRTCOffer(socket, data) {
        try {
            const connection = this.getConnection(socket.id);
            if (!connection) {
                socket.emit('error', { message: 'Você não está em uma conversa ativa' });
                return;
            }
            
            const partnerSocket = this.io.sockets.sockets.get(connection.partnerId);
            if (partnerSocket) {
                partnerSocket.emit('offer', data);
                
                // Armazenar offer no MongoDB
                try {
                    await ChatRoom.findOneAndUpdate(
                        { roomId: connection.roomId },
                        { 'webrtc.offer': data }
                    );
                } catch (mongoError) {
                    console.log('⚠️ MongoDB não disponível para salvar offer:', mongoError.message);
                }
            }
        } catch (error) {
            logger.error('Erro ao processar WebRTC offer:', error);
        }
    }

    async handleWebRTCAnswer(socket, data) {
        try {
            const connection = this.getConnection(socket.id);
            if (!connection) {
                socket.emit('error', { message: 'Você não está em uma conversa ativa' });
                return;
            }
            
            const partnerSocket = this.io.sockets.sockets.get(connection.partnerId);
            if (partnerSocket) {
                partnerSocket.emit('answer', data);
                
                // Armazenar answer no MongoDB
                try {
                    await ChatRoom.findOneAndUpdate(
                        { roomId: connection.roomId },
                        { 'webrtc.answer': data }
                    );
                } catch (mongoError) {
                    console.log('⚠️ MongoDB não disponível para salvar answer:', mongoError.message);
                }
            }
        } catch (error) {
            logger.error('Erro ao processar WebRTC answer:', error);
        }
    }

    async handleWebRTCCandidate(socket, data) {
        try {
            const connection = this.getConnection(socket.id);
            if (!connection) {
                socket.emit('error', { message: 'Você não está em uma conversa ativa' });
                return;
            }
            
            const partnerSocket = this.io.sockets.sockets.get(connection.partnerId);
            if (partnerSocket) {
                partnerSocket.emit('candidate', data);
                
                // Armazenar candidate no MongoDB
                try {
                    await ChatRoom.findOneAndUpdate(
                        { roomId: connection.roomId },
                        { $push: { 'webrtc.candidates': data } }
                    );
                } catch (mongoError) {
                    console.log('⚠️ MongoDB não disponível para salvar candidate:', mongoError.message);
                }
            }
        } catch (error) {
            logger.error('Erro ao processar WebRTC candidate:', error);
        }
    }

    async handleNext(socket) {
        try {
            const connection = this.getConnection(socket.id);
            if (connection) {
                const partnerSocket = this.io.sockets.sockets.get(connection.partnerId);
                if (partnerSocket) {
                    partnerSocket.emit('partner_left', { message: 'Seu parceiro saiu da conversa' });
                }
                
                // Remover conexão
                this.removeFromActiveConnection(socket.id, connection.type);
                
                // Finalizar sala no MongoDB
                try {
                    await ChatRoom.findOneAndUpdate(
                        { roomId: connection.roomId },
                        { 
                            status: 'ended',
                            'stats.endedAt': Date.now()
                        }
                    );
                } catch (mongoError) {
                    console.log('⚠️ MongoDB não disponível para finalizar sala:', mongoError.message);
                }
                
                // Deletar sala do Redis
                await redisService.deleteChatRoom(connection.roomId);
            }
            
            // Adicionar de volta à fila de espera
            const chatType = this.socketChatType.get(socket.id);
            if (chatType) {
                await this.addToWaitingQueue(socket, chatType);
            }
        } catch (error) {
            logger.error('Erro ao processar next:', error);
        }
    }

    async handleDisconnect(socket, isStatsOnly) {
        try {
            if (!isStatsOnly) {
                // Remover usuário online
                this.removeOnlineUser(socket.id);
                
                // Remover da fila de espera
                const chatType = this.socketChatType.get(socket.id);
                if (chatType) {
                    await redisService.removeFromWaitingQueue(socket.id, chatType);
                    
                    const waitingQueue = chatType === 'text' ? this.textChatWaitingUsers : this.videoChatWaitingUsers;
                    const index = waitingQueue.indexOf(socket.id);
                    if (index > -1) {
                        waitingQueue.splice(index, 1);
                    }
                }
                
                // Remover conexão ativa
                const connection = this.getConnection(socket.id);
                if (connection) {
                    const partnerSocket = this.io.sockets.sockets.get(connection.partnerId);
                    if (partnerSocket) {
                        partnerSocket.emit('partner_left', { message: 'Seu parceiro desconectou' });
                    }
                    
                    this.removeFromActiveConnection(socket.id, connection.type);
                    
                    // Finalizar sala no MongoDB
                    try {
                        await ChatRoom.findOneAndUpdate(
                            { roomId: connection.roomId },
                            { 
                                status: 'ended',
                                'stats.endedAt': Date.now()
                            }
                        );
                    } catch (mongoError) {
                        console.log('⚠️ MongoDB não disponível para finalizar sala:', mongoError.message);
                    }
                    
                    // Deletar sala do Redis
                    await redisService.deleteChatRoom(connection.roomId);
                }
                
                // Limpar tipo de chat
                this.socketChatType.delete(socket.id);
                
                logger.info(`Usuário ${socket.id} desconectou`);
            }
        } catch (error) {
            logger.error('Erro ao processar desconexão:', error);
        }
    }

    removeFromActiveConnection(socketId, chatType) {
        const connections = chatType === 'text' ? this.textChatConnections : this.videoChatConnections;
        connections.delete(socketId);
    }

    async addOnlineUser(socketId) {
        try {
            this.onlineUsers.add(socketId);
            
            // Adicionar ao Redis
            await redisService.addOnlineUser(socketId, {
                connectedAt: Date.now()
            });
            
            // Criar ou atualizar usuário no MongoDB
            try {
                await User.findOneAndUpdate(
                    { socketId },
                    { 
                        socketId,
                        isOnline: true,
                        lastSeen: Date.now()
                    },
                    { upsert: true, new: true }
                );
            } catch (mongoError) {
                console.log('⚠️ MongoDB não disponível para salvar usuário:', mongoError.message);
            }
            
            // Broadcast contagem online
            this.broadcastOnlineCount();
        } catch (error) {
            logger.error('Erro ao adicionar usuário online:', error);
        }
    }

    async removeOnlineUser(socketId) {
        try {
            this.onlineUsers.delete(socketId);
            
            // Remover do Redis
            await redisService.removeOnlineUser(socketId);
            
            // Atualizar usuário no MongoDB
            try {
                await User.findOneAndUpdate(
                    { socketId },
                    { 
                        isOnline: false,
                        lastSeen: Date.now()
                    }
                );
            } catch (mongoError) {
                console.log('⚠️ MongoDB não disponível para atualizar usuário:', mongoError.message);
            }
            
            // Broadcast contagem online
            this.broadcastOnlineCount();
        } catch (error) {
            logger.error('Erro ao remover usuário online:', error);
        }
    }

    async broadcastOnlineCount() {
        try {
            const onlineCount = await redisService.getOnlineCount();
            const stats = await this.getOnlineStats();
            
            console.log(`📊 Broadcast - Online: ${onlineCount}, Stats:`, stats);
            
            // Emitir tanto online_count quanto online_stats para compatibilidade
            this.io.emit('online_count', { count: onlineCount });
            this.io.emit('online_stats', stats);
        } catch (error) {
            logger.error('Erro ao broadcast contagem online:', error);
        }
    }

    async getOnlineStats() {
        try {
            const onlineCount = await redisService.getOnlineCount();
            const textWaiting = await redisService.getWaitingCount('text');
            const videoWaiting = await redisService.getWaitingCount('video');
            
            return {
                onlineCount,
                textWaiting,
                videoWaiting,
                textActive: this.textChatConnections.size,
                videoActive: this.videoChatConnections.size,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Erro ao obter estatísticas online:', error);
            return {
                onlineCount: 0,
                textWaiting: 0,
                videoWaiting: 0,
                textActive: 0,
                videoActive: 0,
                timestamp: new Date().toISOString()
            };
        }
    }

    start() {
        this.server.listen(this.port, () => {
            logger.info(`Servidor Omegle iniciado na porta ${this.port}`);
        });
    }
}

module.exports = OmegleServer; 