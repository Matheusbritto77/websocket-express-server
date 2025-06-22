const redis = require('redis');

class RedisService {
    constructor() {
        this.redis = null;
        this.initialize();
    }

    async initialize() {
        try {
            console.log('🔄 Inicializando Redis Service...');
            console.log(`🔗 Redis URL: ${process.env.REDIS_EXTERNAL_URL || 'redis://default:Setcel2@@@168.231.95.211:6379'}`);
            
            this.redis = redis.createClient({
                url: process.env.REDIS_EXTERNAL_URL || 'redis://default:Setcel2@@@168.231.95.211:6379',
                password: process.env.REDIS_PASSWORD || undefined,
                database: parseInt(process.env.REDIS_DB) || 0
            });

            this.redis.on('error', (err) => {
                console.error('❌ Erro na conexão Redis:', err);
            });

            this.redis.on('connect', () => {
                console.log('✅ Redis Service conectado com sucesso');
            });

            await this.redis.connect();
            console.log('✅ Redis Service inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar Redis Service:', error);
            throw error;
        }
    }

    // Gerenciamento de usuários online
    async addOnlineUser(socketId, userData = {}) {
        try {
            const userKey = `user:${socketId}`;
            const onlineUsersKey = 'online_users';
            
            // Salvar dados do usuário
            await this.redis.hSet(userKey, {
                socketId,
                timestamp: Date.now(),
                ...userData
            });
            
            // Adicionar à lista de usuários online
            await this.redis.sAdd(onlineUsersKey, socketId);
            
            // Definir TTL para limpeza automática
            await this.redis.expire(userKey, 3600); // 1 hora
            
            return true;
        } catch (error) {
            console.error('Erro ao adicionar usuário online:', error);
            return false;
        }
    }

    async removeOnlineUser(socketId) {
        try {
            const userKey = `user:${socketId}`;
            const onlineUsersKey = 'online_users';
            
            await this.redis.del(userKey);
            await this.redis.sRem(onlineUsersKey, socketId);
            
            return true;
        } catch (error) {
            console.error('Erro ao remover usuário online:', error);
            return false;
        }
    }

    async getOnlineUsers() {
        try {
            const onlineUsersKey = 'online_users';
            const socketIds = await this.redis.sMembers(onlineUsersKey);
            
            const users = [];
            for (const socketId of socketIds) {
                const userData = await this.redis.hGetAll(`user:${socketId}`);
                if (userData.socketId) {
                    users.push(userData);
                }
            }
            
            return users;
        } catch (error) {
            console.error('Erro ao obter usuários online:', error);
            return [];
        }
    }

    async getOnlineCount() {
        try {
            const onlineUsersKey = 'online_users';
            return await this.redis.sCard(onlineUsersKey);
        } catch (error) {
            console.error('Erro ao obter contagem de usuários online:', error);
            return 0;
        }
    }

    // Gerenciamento de salas de chat
    async createChatRoom(roomId, user1, user2) {
        try {
            const roomKey = `chat_room:${roomId}`;
            const roomData = {
                id: roomId,
                user1,
                user2,
                createdAt: Date.now(),
                status: 'active'
            };
            
            await this.redis.hSet(roomKey, roomData);
            await this.redis.expire(roomKey, 7200); // 2 horas
            
            // Adicionar usuários à sala
            await this.redis.sAdd(`room_users:${roomId}`, user1, user2);
            
            return true;
        } catch (error) {
            console.error('Erro ao criar sala de chat:', error);
            return false;
        }
    }

    async getChatRoom(roomId) {
        try {
            const roomKey = `chat_room:${roomId}`;
            return await this.redis.hGetAll(roomKey);
        } catch (error) {
            console.error('Erro ao obter sala de chat:', error);
            return null;
        }
    }

    async deleteChatRoom(roomId) {
        try {
            const roomKey = `chat_room:${roomId}`;
            const roomUsersKey = `room_users:${roomId}`;
            
            await this.redis.del(roomKey);
            await this.redis.del(roomUsersKey);
            
            return true;
        } catch (error) {
            console.error('Erro ao deletar sala de chat:', error);
            return false;
        }
    }

    // Gerenciamento de fila de espera
    async addToWaitingQueue(socketId, chatType = 'text') {
        try {
            const queueKey = `waiting_queue:${chatType}`;
            await this.redis.lPush(queueKey, socketId);
            await this.redis.expire(queueKey, 3600); // 1 hora
            
            return true;
        } catch (error) {
            console.error('Erro ao adicionar à fila de espera:', error);
            return false;
        }
    }

    async removeFromWaitingQueue(socketId, chatType = 'text') {
        try {
            const queueKey = `waiting_queue:${chatType}`;
            await this.redis.lRem(queueKey, 0, socketId);
            
            return true;
        } catch (error) {
            console.error('Erro ao remover da fila de espera:', error);
            return false;
        }
    }

    async getWaitingQueue(chatType = 'text') {
        try {
            const queueKey = `waiting_queue:${chatType}`;
            return await this.redis.lRange(queueKey, 0, -1);
        } catch (error) {
            console.error('Erro ao obter fila de espera:', error);
            return [];
        }
    }

    async getWaitingCount(chatType = 'text') {
        try {
            const queueKey = `waiting_queue:${chatType}`;
            return await this.redis.lLen(queueKey);
        } catch (error) {
            console.error('Erro ao obter contagem da fila de espera:', error);
            return 0;
        }
    }

    // Gerenciamento de mensagens
    async storeMessage(roomId, message) {
        try {
            const messagesKey = `messages:${roomId}`;
            const messageData = {
                ...message,
                timestamp: Date.now()
            };
            
            await this.redis.lPush(messagesKey, JSON.stringify(messageData));
            await this.redis.lTrim(messagesKey, 0, 99); // Manter apenas as últimas 100 mensagens
            await this.redis.expire(messagesKey, 86400); // 24 horas
            
            return true;
        } catch (error) {
            console.error('Erro ao armazenar mensagem:', error);
            return false;
        }
    }

    async getMessages(roomId, limit = 50) {
        try {
            const messagesKey = `messages:${roomId}`;
            const messages = await this.redis.lRange(messagesKey, 0, limit - 1);
            
            return messages.map(msg => JSON.parse(msg)).reverse();
        } catch (error) {
            console.error('Erro ao obter mensagens:', error);
            return [];
        }
    }

    // Rate limiting
    async checkRateLimit(identifier, limit, windowMs) {
        try {
            const key = `rate_limit:${identifier}`;
            const current = await this.redis.incr(key);
            
            if (current === 1) {
                await this.redis.expire(key, Math.floor(windowMs / 1000));
            }
            
            return current <= limit;
        } catch (error) {
            console.error('Erro ao verificar rate limit:', error);
            return true; // Permitir em caso de erro
        }
    }

    // Cache de estatísticas
    async cacheStats(stats) {
        try {
            const statsKey = 'server_stats';
            await this.redis.setEx(statsKey, 300, JSON.stringify(stats)); // 5 minutos
            return true;
        } catch (error) {
            console.error('Erro ao cachear estatísticas:', error);
            return false;
        }
    }

    async getCachedStats() {
        try {
            const statsKey = 'server_stats';
            const stats = await this.redis.get(statsKey);
            return stats ? JSON.parse(stats) : null;
        } catch (error) {
            console.error('Erro ao obter estatísticas em cache:', error);
            return null;
        }
    }

    // Limpeza de dados expirados
    async cleanupExpiredData() {
        try {
            // Esta função pode ser chamada periodicamente para limpar dados expirados
            console.log('🔄 Limpeza de dados expirados iniciada...');
            
            // Redis faz limpeza automática com TTL, mas podemos adicionar lógica adicional aqui
            
            return true;
        } catch (error) {
            console.error('Erro na limpeza de dados:', error);
            return false;
        }
    }

    // Health check
    async healthCheck() {
        try {
            await this.redis.ping();
            return true;
        } catch (error) {
            console.error('Redis health check falhou:', error);
            return false;
        }
    }
}

module.exports = new RedisService(); 