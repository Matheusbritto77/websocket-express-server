const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const logger = require('./config/logger');

class OmegleServer {
    constructor(port = 3000) {
        this.port = port;
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: { origin: '*', methods: ['GET', 'POST'] }
        });
        
        // Filas separadas para chat de texto e chat com vídeo
        this.textChatWaitingUsers = [];
        this.videoChatWaitingUsers = [];
        
        // Conexões ativas separadas por tipo
        this.textChatConnections = new Map(); // socketId -> { partnerId, roomId, type: 'text' }
        this.videoChatConnections = new Map(); // socketId -> { partnerId, roomId, type: 'video' }
        
        // Mapeamento de socket para tipo de chat
        this.socketChatType = new Map(); // socketId -> 'text' | 'video'
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketHandlers();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, '../public')));
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'UP', 
                timestamp: new Date().toISOString(),
                textChatWaitingUsers: this.textChatWaitingUsers.length,
                videoChatWaitingUsers: this.videoChatWaitingUsers.length,
                textChatConnections: this.textChatConnections.size,
                videoChatConnections: this.videoChatConnections.size
            });
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

        // Estatísticas
        this.app.get('/api/stats', (req, res) => {
            res.json({
                textChat: {
                    waitingUsers: this.textChatWaitingUsers.length,
                    activeConnections: this.textChatConnections.size
                },
                videoChat: {
                    waitingUsers: this.videoChatWaitingUsers.length,
                    activeConnections: this.videoChatConnections.size
                },
                timestamp: new Date().toISOString()
            });
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            logger.info(`Nova conexão: ${socket.id}`);
            
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
                this.handleDisconnect(socket);
            });
        });
    }

    handleJoinChat(socket, data) {
        const chatType = data.type; // 'text' ou 'video'
        
        if (chatType !== 'text' && chatType !== 'video') {
            socket.emit('error', { message: 'Tipo de chat inválido' });
            return;
        }
        
        // Define o tipo de chat para este socket
        this.socketChatType.set(socket.id, chatType);
        
        logger.info(`Usuário ${socket.id} entrou no chat ${chatType}`);
        
        // Adiciona à fila apropriada
        this.addToWaitingQueue(socket, chatType);
    }

    addToWaitingQueue(socket, chatType) {
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
        this.tryMatch(chatType);
    }

    tryMatch(chatType) {
        const waitingQueue = chatType === 'text' ? this.textChatWaitingUsers : this.videoChatWaitingUsers;
        const connections = chatType === 'text' ? this.textChatConnections : this.videoChatConnections;
        
        // Se há pelo menos 2 usuários esperando, faz o match
        if (waitingQueue.length >= 2) {
            const user1 = waitingQueue.shift();
            const user2 = waitingQueue.shift();
            
            const roomId = `${chatType}_room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
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
            
            logger.info(`Match criado no chat ${chatType}: ${user1} <-> ${user2} (Sala: ${roomId})`);
        }
    }

    getConnection(socketId) {
        // Verifica primeiro nas conexões de texto
        let connection = this.textChatConnections.get(socketId);
        if (connection) return connection;
        
        // Se não encontrou, verifica nas conexões de vídeo
        connection = this.videoChatConnections.get(socketId);
        return connection;
    }

    handleMessage(socket, data) {
        const connection = this.getConnection(socket.id);
        if (!connection) {
            socket.emit('error', { message: 'Você não está conectado com ninguém' });
            return;
        }
        
        const partnerSocket = this.io.sockets.sockets.get(connection.partnerId);
        if (partnerSocket) {
            partnerSocket.emit('message', {
                text: data.text,
                timestamp: new Date().toISOString(),
                from: socket.id
            });
        }
    }

    handleWebRTCOffer(socket, data) {
        const connection = this.videoChatConnections.get(socket.id);
        if (!connection) {
            socket.emit('error', { message: 'Você não está conectado com ninguém no chat de vídeo' });
            return;
        }
        
        const partnerSocket = this.io.sockets.sockets.get(connection.partnerId);
        if (partnerSocket) {
            partnerSocket.emit('offer', {
                offer: data.offer,
                from: socket.id
            });
        }
    }

    handleWebRTCAnswer(socket, data) {
        const connection = this.videoChatConnections.get(socket.id);
        if (!connection) {
            socket.emit('error', { message: 'Você não está conectado com ninguém no chat de vídeo' });
            return;
        }
        
        const partnerSocket = this.io.sockets.sockets.get(connection.partnerId);
        if (partnerSocket) {
            partnerSocket.emit('answer', {
                answer: data.answer,
                from: socket.id
            });
        }
    }

    handleWebRTCCandidate(socket, data) {
        const connection = this.videoChatConnections.get(socket.id);
        if (!connection) {
            socket.emit('error', { message: 'Você não está conectado com ninguém no chat de vídeo' });
            return;
        }
        
        const partnerSocket = this.io.sockets.sockets.get(connection.partnerId);
        if (partnerSocket) {
            partnerSocket.emit('candidate', {
                candidate: data.candidate,
                from: socket.id
            });
        }
    }

    handleNext(socket) {
        const chatType = this.socketChatType.get(socket.id);
        logger.info(`Usuário ${socket.id} solicitou próximo no chat ${chatType}`);
        
        // Remove da conexão atual
        this.removeFromActiveConnection(socket.id, chatType);
        
        // Adiciona de volta à fila
        this.addToWaitingQueue(socket, chatType);
    }

    handleDisconnect(socket) {
        const chatType = this.socketChatType.get(socket.id);
        logger.info(`Usuário ${socket.id} desconectado do chat ${chatType}`);
        
        // Remove da fila de espera apropriada
        if (chatType === 'text') {
            this.textChatWaitingUsers = this.textChatWaitingUsers.filter(id => id !== socket.id);
        } else if (chatType === 'video') {
            this.videoChatWaitingUsers = this.videoChatWaitingUsers.filter(id => id !== socket.id);
        }
        
        // Remove de conexões ativas
        this.removeFromActiveConnection(socket.id, chatType);
        
        // Remove o tipo de chat
        this.socketChatType.delete(socket.id);
    }

    removeFromActiveConnection(socketId, chatType) {
        const connections = chatType === 'text' ? this.textChatConnections : this.videoChatConnections;
        const waitingQueue = chatType === 'text' ? this.textChatWaitingUsers : this.videoChatWaitingUsers;
        
        const connection = connections.get(socketId);
        if (connection) {
            logger.info(`Removendo usuário ${socketId} da conexão ativa do chat ${chatType}`);
            
            // Notifica o parceiro sobre a desconexão
            const partnerSocket = this.io.sockets.sockets.get(connection.partnerId);
            if (partnerSocket) {
                logger.info(`Notificando parceiro ${connection.partnerId} sobre desconexão de ${socketId}`);
                partnerSocket.emit('status', { 
                    type: 'partner_disconnected', 
                    message: `Seu parceiro desconectou do chat ${chatType === 'text' ? 'de texto' : 'com vídeo'}. Procurando novo usuário...`,
                    chatType: chatType
                });

                // Adiciona o parceiro de volta à fila apenas se não estiver lá
                if (!waitingQueue.includes(connection.partnerId)) {
                    waitingQueue.push(connection.partnerId);
                    logger.info(`Parceiro ${connection.partnerId} adicionado de volta à fila do chat ${chatType}`);
                    this.tryMatch(chatType);
                }
            }

            // Remove as conexões
            connections.delete(socketId);
            connections.delete(connection.partnerId);
            
            logger.info(`Conexões removidas para ${socketId} e ${connection.partnerId} no chat ${chatType}`);
        }
    }

    start() {
        this.server.listen(this.port, () => {
            logger.info(`🚀 Servidor Omegle iniciado na porta ${this.port}`);
            logger.info(`📊 API disponível em: http://localhost:${this.port}`);
            logger.info(`🎯 Estatísticas: http://localhost:${this.port}/api/stats`);
        });
        
        return this.server;
    }
}

module.exports = OmegleServer; 