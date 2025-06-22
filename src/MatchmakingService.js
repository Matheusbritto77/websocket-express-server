const { v4: uuidv4 } = require('uuid');
const redisConnection = require('./infrastructure/redis');
const logger = require('./config/logger');

class MatchmakingService {
    constructor() {
        this.queueA = []; // Fila A (lado esquerdo)
        this.queueB = []; // Fila B (lado direito)
        this.activeMatches = new Map(); // Mapeia socketId -> roomId
        this.redis = redisConnection.client;
        this.onMatchCallback = null; // Callback para quando um match é criado
    }

    /**
     * Define callback para quando um match é criado
     * @param {Function} callback - Função chamada quando match é criado
     */
    setMatchCallback(callback) {
        this.onMatchCallback = callback;
    }

    /**
     * Adiciona um usuário à fila de matchmaking
     * @param {string} socketId - ID do socket do usuário
     * @param {string} username - Nome do usuário (opcional)
     * @returns {Promise<Object>} - Informações sobre a posição na fila
     */
    async addToQueue(socketId, username = 'Anonymous') {
        try {
            // Determina em qual fila colocar (sempre alternando para manter balanceado)
            let queueToUse;
            
            if (this.queueA.length === 0 && this.queueB.length === 0) {
                // Primeiro usuário vai para fila A
                queueToUse = 'A';
            } else if (this.queueA.length === 0) {
                // Se fila A está vazia, vai para A
                queueToUse = 'A';
            } else if (this.queueB.length === 0) {
                // Se fila B está vazia, vai para B
                queueToUse = 'B';
            } else if (this.queueA.length <= this.queueB.length) {
                // Se fila A tem menos ou igual usuários, vai para A
                queueToUse = 'A';
            } else {
                // Senão vai para B
                queueToUse = 'B';
            }
            
            const queue = queueToUse === 'A' ? this.queueA : this.queueB;
            
            const userInfo = {
                socketId,
                username,
                timestamp: Date.now(),
                queue: queueToUse
            };

            queue.push(userInfo);
            
            // Salva no Redis para persistência
            await this.redis.hSet(`matchmaking:queue:${queueToUse}`, socketId, JSON.stringify(userInfo));
            
            logger.info(`Usuário ${socketId} adicionado à fila ${queueToUse}. Posição: ${queue.length} (A: ${this.queueA.length}, B: ${this.queueB.length})`);
            
            // Tenta fazer match
            const match = await this.tryMatch();
            
            // Verifica e corrige balanceamento se necessário
            await this.rebalanceQueues();
            
            return {
                queue: queueToUse,
                position: queue.length,
                estimatedWait: this.calculateEstimatedWait(queueToUse)
            };
        } catch (error) {
            logger.error(`Erro ao adicionar usuário à fila: ${error.message}`);
            throw error;
        }
    }

    /**
     * Remove um usuário da fila
     * @param {string} socketId - ID do socket do usuário
     */
    async removeFromQueue(socketId) {
        try {
            // Remove das filas locais
            this.queueA = this.queueA.filter(user => user.socketId !== socketId);
            this.queueB = this.queueB.filter(user => user.socketId !== socketId);
            
            // Remove do Redis
            await this.redis.hDel('matchmaking:queue:A', socketId);
            await this.redis.hDel('matchmaking:queue:B', socketId);
            
            logger.info(`Usuário ${socketId} removido das filas`);
        } catch (error) {
            logger.error(`Erro ao remover usuário da fila: ${error.message}`);
        }
    }

    /**
     * Tenta fazer match entre usuários das filas
     */
    async tryMatch() {
        try {
            logger.info(`🔍 Verificando match... Fila A: ${this.queueA.length}, Fila B: ${this.queueB.length}`);
            
            // Verifica se há pelo menos 1 usuário em cada fila
            if (this.queueA.length >= 1 && this.queueB.length >= 1) {
                // Pega o primeiro usuário de cada fila
                const userA = this.queueA.shift();
                const userB = this.queueB.shift();

                logger.info(`✅ Match possível! Usuário A: ${userA.socketId}, Usuário B: ${userB.socketId}`);

                // Remove do Redis
                await this.redis.hDel('matchmaking:queue:A', userA.socketId);
                await this.redis.hDel('matchmaking:queue:B', userB.socketId);

                // Cria sala para o match
                const roomId = `room-${uuidv4()}`;
                
                // Mapeia usuários para a sala
                this.activeMatches.set(userA.socketId, roomId);
                this.activeMatches.set(userB.socketId, roomId);

                // Salva no Redis
                await this.redis.hSet('matchmaking:active', roomId, JSON.stringify({
                    roomId,
                    users: [userA, userB],
                    createdAt: Date.now()
                }));

                logger.info(`🎯 Match criado! Sala: ${roomId} - Usuários: ${userA.socketId}, ${userB.socketId}`);
                logger.info(`📊 Filas após match - A: ${this.queueA.length}, B: ${this.queueB.length}`);

                const matchResult = {
                    roomId,
                    users: [userA, userB]
                };

                // Chama callback se definido
                if (this.onMatchCallback) {
                    try {
                        await this.onMatchCallback(matchResult);
                    } catch (error) {
                        logger.error(`Erro no callback de match: ${error.message}`);
                    }
                }

                return matchResult;
            } else {
                logger.info(`❌ Nenhum match possível - Fila A: ${this.queueA.length}, Fila B: ${this.queueB.length}`);
            }
        } catch (error) {
            logger.error(`Erro ao tentar fazer match: ${error.message}`);
        }
        return null;
    }

    /**
     * Remove um usuário de uma sala ativa e o coloca de volta na fila
     * @param {string} socketId - ID do socket do usuário
     */
    async removeFromMatch(socketId) {
        try {
            const roomId = this.activeMatches.get(socketId);
            if (!roomId) return;

            // Busca informações da sala
            const roomData = await this.redis.hGet('matchmaking:active', roomId);
            if (!roomData) return;

            const room = JSON.parse(roomData);
            const user = room.users.find(u => u.socketId === socketId);
            
            if (!user) return;

            // Remove usuário da sala
            room.users = room.users.filter(u => u.socketId !== socketId);
            this.activeMatches.delete(socketId);

            // Se ainda há usuários na sala, notifica desconexão
            if (room.users.length > 0) {
                // Atualiza sala no Redis
                await this.redis.hSet('matchmaking:active', roomId, JSON.stringify(room));
                
                // Coloca usuário de volta na fila (sempre na fila oposta para manter balanceamento)
                const newQueue = user.queue === 'A' ? 'B' : 'A';
                await this.addToQueue(socketId, user.username);
                
                logger.info(`🔄 Usuário ${socketId} removido da sala ${roomId} e colocado na fila ${newQueue} (balanceamento)`);
            } else {
                // Sala vazia, remove completamente
                await this.redis.hDel('matchmaking:active', roomId);
                logger.info(`🗑️ Sala ${roomId} removida (vazia)`);
            }
        } catch (error) {
            logger.error(`Erro ao remover usuário do match: ${error.message}`);
        }
    }

    /**
     * Calcula tempo estimado de espera
     * @param {string} queue - Fila (A ou B)
     * @returns {number} - Tempo estimado em segundos
     */
    calculateEstimatedWait(queue) {
        const queueLength = queue === 'A' ? this.queueA.length : this.queueB.length;
        const otherQueueLength = queue === 'A' ? this.queueB.length : this.queueA.length;
        
        // Estimativa baseada no tamanho das filas
        const minQueueLength = Math.min(queueLength, otherQueueLength);
        return Math.max(30, minQueueLength * 15); // Mínimo 30s, 15s por posição
    }

    /**
     * Verifica e corrige o balanceamento das filas
     */
    async rebalanceQueues() {
        try {
            const diff = Math.abs(this.queueA.length - this.queueB.length);
            
            if (diff > 1) {
                logger.info(`⚖️ Rebalanceando filas... Diferença: ${diff}`);
                
                if (this.queueA.length > this.queueB.length + 1) {
                    // Move usuário da fila A para B
                    const user = this.queueA.pop();
                    if (user) {
                        user.queue = 'B';
                        this.queueB.unshift(user);
                        
                        // Atualiza no Redis
                        await this.redis.hDel('matchmaking:queue:A', user.socketId);
                        await this.redis.hSet('matchmaking:queue:B', user.socketId, JSON.stringify(user));
                        
                        logger.info(`🔄 Usuário ${user.socketId} movido da fila A para B (rebalanceamento)`);
                    }
                } else if (this.queueB.length > this.queueA.length + 1) {
                    // Move usuário da fila B para A
                    const user = this.queueB.pop();
                    if (user) {
                        user.queue = 'A';
                        this.queueA.unshift(user);
                        
                        // Atualiza no Redis
                        await this.redis.hDel('matchmaking:queue:B', user.socketId);
                        await this.redis.hSet('matchmaking:queue:A', user.socketId, JSON.stringify(user));
                        
                        logger.info(`🔄 Usuário ${user.socketId} movido da fila B para A (rebalanceamento)`);
                    }
                }
            }
        } catch (error) {
            logger.error(`Erro ao rebalancear filas: ${error.message}`);
        }
    }

    /**
     * Obtém estatísticas das filas
     * @returns {Object} - Estatísticas das filas
     */
    getQueueStats() {
        return {
            queueA: {
                length: this.queueA.length,
                users: this.queueA.map(u => ({ socketId: u.socketId, username: u.username }))
            },
            queueB: {
                length: this.queueB.length,
                users: this.queueB.map(u => ({ socketId: u.socketId, username: u.username }))
            },
            activeMatches: this.activeMatches.size,
            estimatedWaitA: this.calculateEstimatedWait('A'),
            estimatedWaitB: this.calculateEstimatedWait('B'),
            balance: {
                difference: Math.abs(this.queueA.length - this.queueB.length),
                isBalanced: Math.abs(this.queueA.length - this.queueB.length) <= 1
            }
        };
    }

    /**
     * Verifica se um usuário está em uma sala ativa
     * @param {string} socketId - ID do socket do usuário
     * @returns {string|null} - ID da sala ou null
     */
    isInActiveMatch(socketId) {
        return this.activeMatches.get(socketId) || null;
    }

    /**
     * Obtém informações da sala de um usuário
     * @param {string} socketId - ID do socket do usuário
     * @returns {Promise<Object|null>} - Informações da sala ou null
     */
    async getRoomInfo(socketId) {
        try {
            const roomId = this.activeMatches.get(socketId);
            if (!roomId) return null;

            const roomData = await this.redis.hGet('matchmaking:active', roomId);
            if (!roomData) return null;

            return JSON.parse(roomData);
        } catch (error) {
            logger.error(`Erro ao obter informações da sala: ${error.message}`);
            return null;
        }
    }
}

module.exports = MatchmakingService;