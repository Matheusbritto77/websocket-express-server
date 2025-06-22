const { v4: uuidv4 } = require('uuid');
const redisConnection = require('./infrastructure/redis');
const mongoConnection = require('./infrastructure/mongodb');
const UserRepository = require('./repositories/UserRepository');
const RoomRepository = require('./repositories/RoomRepository');
const MatchmakingService = require('./MatchmakingService');
const logger = require('./config/logger');

const EVENT_CONNECTION = 'connection'
const EVENT_CALL = 'call'
const EVENT_OFFER = 'offer'
const EVENT_ANSWER = 'answer'
const EVENT_CANDIDATE = 'candidate'
const EVENT_DISCONNECT_USER = 'disconnect-user'
const EVENT_NEXT = 'next'
const EVENT_JOIN_QUEUE = 'join-queue'
const EVENT_LEAVE_QUEUE = 'leave-queue'
const EVENT_MATCH_FOUND = 'match-found'
const EVENT_QUEUE_UPDATE = 'queue-update'
const EVENT_DISCONNECT = 'disconnect'

class SocketService {
    constructor(http) {
        this.init(http)
    }

    async init(http) {
        // Conexão com Redis e MongoDB
        await redisConnection.connect();
        await mongoConnection.connect();
        this.userRepository = new UserRepository();
        this.roomRepository = new RoomRepository();
        this.matchmakingService = new MatchmakingService();
        
        // Configura callback para quando um match é criado
        this.matchmakingService.setMatchCallback(async (match) => {
            await this.handleMatchFound(match);
        });

        await this.userRepository.init();
        await this.roomRepository.init();

        this.io = require('socket.io')(http, {
            cors: { origin: '*', methods: ['GET', 'POST'] }
        });

        this.io.on(EVENT_CONNECTION, (socket) => {
            logger.info(`Nova conexão: ${socket.id}`);
            this.handleConnection(socket);
        });
    }

    async handleConnection(socket) {
        // Cria usuário no MongoDB
        await this.userRepository.createUser({
            socketId: socket.id,
            roomId: 'queue',
            isOnline: true,
            createdAt: new Date(),
            lastSeen: new Date()
        });

        // Salva no Redis para lookup rápido
        await redisConnection.client.set(`user:${socket.id}`, 'queue');

        // Eventos de matchmaking
        socket.on(EVENT_JOIN_QUEUE, async (data) => {
            try {
                const username = data.username || 'Anonymous';
                const queueInfo = await this.matchmakingService.addToQueue(socket.id, username);
                
                // Notifica o usuário sobre sua posição na fila
                socket.emit(EVENT_QUEUE_UPDATE, {
                    queue: queueInfo.queue,
                    position: queueInfo.position,
                    estimatedWait: queueInfo.estimatedWait
                });

                logger.info(`Usuário ${socket.id} entrou na fila ${queueInfo.queue}`);
                
                // Verifica se foi feito um match
                const stats = this.matchmakingService.getQueueStats();
                logger.info(`📊 Status das filas - A: ${stats.queueA.length}, B: ${stats.queueB.length}, Balanceado: ${stats.balance.isBalanced}`);
                
                // O match já foi tentado dentro do addToQueue, apenas verifica se foi criado
                const roomId = this.matchmakingService.isInActiveMatch(socket.id);
                if (roomId) {
                    logger.info(`🎯 Usuário ${socket.id} está em match ativo na sala ${roomId}`);
                } else {
                    logger.info(`⏳ Usuário ${socket.id} aguardando na fila ${queueInfo.queue}`);
                }
            } catch (error) {
                logger.error(`Erro ao adicionar usuário à fila: ${error.message}`);
                socket.emit('error', { message: 'Erro ao entrar na fila' });
            }
        });

        socket.on(EVENT_LEAVE_QUEUE, async () => {
            try {
                await this.matchmakingService.removeFromQueue(socket.id);
                socket.emit('queue-left', { message: 'Saiu da fila com sucesso' });
                logger.info(`Usuário ${socket.id} saiu da fila`);
            } catch (error) {
                logger.error(`Erro ao remover usuário da fila: ${error.message}`);
            }
        });

        // Eventos WebRTC (apenas para usuários em salas ativas)
        socket.on(EVENT_OFFER, async (data) => {
            const roomId = this.matchmakingService.isInActiveMatch(socket.id);
            if (roomId) {
                logger.info(`${socket.id} enviando offer para ${data.id}`);
                socket.to(data.id).emit(EVENT_OFFER, {
                    id: socket.id,
                    offer: data.offer
                });
            }
        });

        socket.on(EVENT_ANSWER, async (data) => {
            const roomId = this.matchmakingService.isInActiveMatch(socket.id);
            if (roomId) {
                logger.info(`${socket.id} enviando answer para ${data.id}`);
                socket.to(data.id).emit(EVENT_ANSWER, {
                    id: socket.id,
                    answer: data.answer
                });
            }
        });
                
        socket.on(EVENT_CANDIDATE, async (data) => {
            const roomId = this.matchmakingService.isInActiveMatch(socket.id);
            if (roomId) {
                logger.info(`${socket.id} enviando candidate para ${data.id}`);
                socket.to(data.id).emit(EVENT_CANDIDATE, {
                    id: socket.id,
                    candidate: data.candidate
                });
            }
        });

        socket.on(EVENT_NEXT, async () => {
            try {
                // Remove usuário da sala atual e coloca de volta na fila
                await this.matchmakingService.removeFromMatch(socket.id);
                
                // Notifica outros usuários da sala
                const roomInfo = await this.matchmakingService.getRoomInfo(socket.id);
                if (roomInfo) {
                    this.io.to(roomInfo.roomId).emit(EVENT_DISCONNECT_USER, { id: socket.id });
                }
                
                socket.emit('next-requested', { message: 'Solicitação de próximo usuário processada' });
                logger.info(`Usuário ${socket.id} solicitou próximo usuário`);
            } catch (error) {
                logger.error(`Erro ao processar solicitação de próximo: ${error.message}`);
            }
        });

        socket.on(EVENT_DISCONNECT, async () => {
            logger.info(`${socket.id} desconectado`);
            
            try {
                // Marca usuário como offline no MongoDB
                await this.userRepository.setUserOffline(socket.id);
                
                // Remove do Redis
                await redisConnection.client.del(`user:${socket.id}`);
                
                // Remove da fila ou da sala ativa
                const roomId = this.matchmakingService.isInActiveMatch(socket.id);
                if (roomId) {
                    // Estava em uma sala ativa
                    await this.matchmakingService.removeFromMatch(socket.id);
                    
                    // Notifica outros usuários da sala
                    const roomInfo = await this.matchmakingService.getRoomInfo(socket.id);
                    if (roomInfo) {
                        this.io.to(roomInfo.roomId).emit(EVENT_DISCONNECT_USER, { id: socket.id });
                    }
                } else {
                    // Estava na fila
                    await this.matchmakingService.removeFromQueue(socket.id);
                }
            } catch (error) {
                logger.error(`Erro ao processar desconexão: ${error.message}`);
            }
        });
    }

    async handleMatchFound(match) {
        try {
            const { roomId, users } = match;
            
            // Cria sala no MongoDB
            await this.roomRepository.createRoom({
                roomId: roomId,
                currentUsers: users.length,
                isActive: true,
                createdAt: new Date()
            });

            // Adiciona todos os usuários à sala
            for (const user of users) {
                await this.userRepository.updateUser(user.socketId, {
                    roomId: roomId,
                    lastSeen: new Date()
                });
                
                // Adiciona socket à sala
                const socket = this.io.sockets.sockets.get(user.socketId);
                if (socket) {
                    socket.join(roomId);
                }
            }

            // Notifica todos os usuários sobre o match
            this.io.to(roomId).emit(EVENT_MATCH_FOUND, {
                roomId: roomId,
                users: users.map(u => ({ socketId: u.socketId, username: u.username })),
                message: 'Match encontrado! Conectando usuários...'
            });

            // Notifica cada usuário sobre os outros na sala
            for (const user of users) {
                const socket = this.io.sockets.sockets.get(user.socketId);
                if (socket) {
                    const otherUsers = users.filter(u => u.socketId !== user.socketId);
                    socket.emit(EVENT_CALL, {
                        roomId: roomId,
                        users: otherUsers.map(u => ({ socketId: u.socketId, username: u.username }))
                    });
                }
            }

            logger.info(`Match processado com sucesso! Sala: ${roomId}`);
        } catch (error) {
            logger.error(`Erro ao processar match: ${error.message}`);
        }
    }
}

module.exports = (http) => {
    return new SocketService(http)
}