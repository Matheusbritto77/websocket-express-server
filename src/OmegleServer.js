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
        
        // Fila de espera simples (como o Omegle)
        this.waitingUsers = [];
        this.activeConnections = new Map(); // socketId -> { partnerId, roomId }
        
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
                waitingUsers: this.waitingUsers.length,
                activeConnections: this.activeConnections.size
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
                waitingUsers: this.waitingUsers.length,
                activeConnections: this.activeConnections.size,
                timestamp: new Date().toISOString()
            });
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            logger.info(`Nova conexão: ${socket.id}`);
            
            // Adiciona à fila de espera
            this.addToWaitingQueue(socket);
            
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

    addToWaitingQueue(socket) {
        // Adiciona à fila de espera apenas o id se não estiver presente
        if (!this.waitingUsers.includes(socket.id)) {
            this.waitingUsers.push(socket.id);
            logger.info(`Usuário ${socket.id} adicionado à fila. Total: ${this.waitingUsers.length}`);
        }

        // Notifica o usuário
        socket.emit('status', { 
            type: 'waiting', 
            message: 'Procurando alguém para conversar...',
            position: this.waitingUsers.length
        });

        // Tenta fazer match
        this.tryMatch();
    }

    tryMatch() {
        // Se há pelo menos 2 usuários esperando, faz o match
        if (this.waitingUsers.length >= 2) {
            const user1 = this.waitingUsers.shift();
            const user2 = this.waitingUsers.shift();
            
            const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Cria a conexão
            this.activeConnections.set(user1, { partnerId: user2, roomId });
            this.activeConnections.set(user2, { partnerId: user1, roomId });
            
            // Notifica os usuários
            const socket1 = this.io.sockets.sockets.get(user1);
            const socket2 = this.io.sockets.sockets.get(user2);
            
            if (socket1) {
                socket1.emit('status', { 
                    type: 'connected', 
                    message: 'Conectado! Você pode começar a conversar.',
                    roomId,
                    partnerId: user2
                });
            }
            
            if (socket2) {
                socket2.emit('status', { 
                    type: 'connected', 
                    message: 'Conectado! Você pode começar a conversar.',
                    roomId,
                    partnerId: user1
                });
            }
            
            logger.info(`Match criado: ${user1} <-> ${user2} (Sala: ${roomId})`);
        }
    }

    handleMessage(socket, data) {
        const connection = this.activeConnections.get(socket.id);
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
        const connection = this.activeConnections.get(socket.id);
        if (!connection) {
            socket.emit('error', { message: 'Você não está conectado com ninguém' });
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
        const connection = this.activeConnections.get(socket.id);
        if (!connection) {
            socket.emit('error', { message: 'Você não está conectado com ninguém' });
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
        const connection = this.activeConnections.get(socket.id);
        if (!connection) {
            socket.emit('error', { message: 'Você não está conectado com ninguém' });
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
        logger.info(`Usuário ${socket.id} solicitou próximo`);
        
        // Remove da conexão atual
        this.removeFromActiveConnection(socket.id);
        
        // Adiciona de volta à fila
        this.addToWaitingQueue(socket);
    }

    handleDisconnect(socket) {
        logger.info(`Usuário ${socket.id} desconectado`);
        
        // Remove da fila de espera
        this.waitingUsers = this.waitingUsers.filter(id => id !== socket.id);
        
        // Remove de conexões ativas
        this.removeFromActiveConnection(socket.id);
    }

    removeFromActiveConnection(socketId) {
        const connection = this.activeConnections.get(socketId);
        if (connection) {
            logger.info(`Removendo usuário ${socketId} da conexão ativa`);
            
            // Notifica o parceiro sobre a desconexão
            const partnerSocket = this.io.sockets.sockets.get(connection.partnerId);
            if (partnerSocket) {
                logger.info(`Notificando parceiro ${connection.partnerId} sobre desconexão de ${socketId}`);
                partnerSocket.emit('status', { 
                    type: 'partner_disconnected', 
                    message: 'Seu parceiro desconectou. Procurando novo usuário...' 
                });

                // Adiciona o parceiro de volta à fila apenas se não estiver lá
                if (!this.waitingUsers.includes(connection.partnerId)) {
                    this.waitingUsers.push(connection.partnerId);
                    logger.info(`Parceiro ${connection.partnerId} adicionado de volta à fila`);
                    this.tryMatch();
                }
            }

            // Remove as conexões
            this.activeConnections.delete(socketId);
            this.activeConnections.delete(connection.partnerId);
            
            logger.info(`Conexões removidas para ${socketId} e ${connection.partnerId}`);
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