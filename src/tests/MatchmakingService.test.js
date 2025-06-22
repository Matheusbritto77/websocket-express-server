const MatchmakingService = require('../MatchmakingService');
const redisConnection = require('../infrastructure/redis');

describe('MatchmakingService', () => {
    let matchmakingService;

    beforeAll(async () => {
        await redisConnection.connect();
    });

    afterAll(async () => {
        await redisConnection.disconnect();
    });

    beforeEach(async () => {
        matchmakingService = new MatchmakingService();
        // Limpa as filas antes de cada teste
        await redisConnection.client.del('matchmaking:queue:A');
        await redisConnection.client.del('matchmaking:queue:B');
        await redisConnection.client.del('matchmaking:active');
    });

    afterEach(async () => {
        // Limpa as filas após cada teste
        await redisConnection.client.del('matchmaking:queue:A');
        await redisConnection.client.del('matchmaking:queue:B');
        await redisConnection.client.del('matchmaking:active');
    });

    it('deve adicionar usuário à fila A quando ela está vazia', async () => {
        const result = await matchmakingService.addToQueue('user1', 'TestUser1');
        
        expect(result.queue).toBe('A');
        expect(result.position).toBe(1);
        expect(matchmakingService.queueA.length).toBe(1);
        expect(matchmakingService.queueB.length).toBe(0);
    });

    it('deve alternar entre filas A e B', async () => {
        // Primeiro usuário vai para fila A
        const result1 = await matchmakingService.addToQueue('user1', 'TestUser1');
        expect(result1.queue).toBe('A');
        
        // Segundo usuário vai para fila B (alternando)
        const result2 = await matchmakingService.addToQueue('user2', 'TestUser2');
        expect(result2.queue).toBe('B');
        
        // Terceiro usuário vai para fila A novamente
        const result3 = await matchmakingService.addToQueue('user3', 'TestUser3');
        expect(result3.queue).toBe('A');
    });

    it('deve fazer match quando há 2 usuários em cada fila', async () => {
        // Adiciona 2 usuários em cada fila
        await matchmakingService.addToQueue('userA1', 'UserA1');
        await matchmakingService.addToQueue('userA2', 'UserA2');
        await matchmakingService.addToQueue('userB1', 'UserB1');
        await matchmakingService.addToQueue('userB2', 'UserB2');

        // Verifica se o match foi criado
        expect(matchmakingService.queueA.length).toBe(0);
        expect(matchmakingService.queueB.length).toBe(0);
        expect(matchmakingService.activeMatches.size).toBe(4);
    });

    it('deve remover usuário da fila', async () => {
        await matchmakingService.addToQueue('user1', 'TestUser1');
        expect(matchmakingService.queueA.length).toBe(1);
        
        await matchmakingService.removeFromQueue('user1');
        expect(matchmakingService.queueA.length).toBe(0);
    });

    it('deve calcular tempo estimado de espera', () => {
        const waitTime = matchmakingService.calculateEstimatedWait('A');
        expect(waitTime).toBeGreaterThanOrEqual(30);
    });

    it('deve obter estatísticas das filas', () => {
        const stats = matchmakingService.getQueueStats();
        
        expect(stats).toHaveProperty('queueA');
        expect(stats).toHaveProperty('queueB');
        expect(stats).toHaveProperty('activeMatches');
        expect(stats).toHaveProperty('estimatedWaitA');
        expect(stats).toHaveProperty('estimatedWaitB');
    });

    it('deve verificar se usuário está em match ativo', async () => {
        // Adiciona usuários para criar um match
        await matchmakingService.addToQueue('userA1', 'UserA1');
        await matchmakingService.addToQueue('userA2', 'UserA2');
        await matchmakingService.addToQueue('userB1', 'UserB1');
        await matchmakingService.addToQueue('userB2', 'UserB2');

        const roomId = matchmakingService.isInActiveMatch('userA1');
        expect(roomId).toBeTruthy();
    });

    it('deve remover usuário de match e colocá-lo de volta na fila', async () => {
        // Cria um match primeiro
        await matchmakingService.addToQueue('userA1', 'UserA1');
        await matchmakingService.addToQueue('userA2', 'UserA2');
        await matchmakingService.addToQueue('userB1', 'UserB1');
        await matchmakingService.addToQueue('userB2', 'UserB2');

        // Verifica que o match foi criado
        expect(matchmakingService.activeMatches.size).toBe(4);

        // Remove usuário do match
        await matchmakingService.removeFromMatch('userA1');

        // Verifica que o usuário foi removido do match ativo
        expect(matchmakingService.activeMatches.size).toBe(3);
        
        // Verifica que o usuário foi colocado de volta na fila (pode estar em A ou B dependendo da lógica)
        const totalInQueues = matchmakingService.queueA.length + matchmakingService.queueB.length;
        expect(totalInQueues).toBe(1);
        
        // Verifica que o usuário não está mais no match ativo
        expect(matchmakingService.isInActiveMatch('userA1')).toBeNull();
    });

    it('deve obter informações da sala', async () => {
        // Cria um match
        await matchmakingService.addToQueue('userA1', 'UserA1');
        await matchmakingService.addToQueue('userA2', 'UserA2');
        await matchmakingService.addToQueue('userB1', 'UserB1');
        await matchmakingService.addToQueue('userB2', 'UserB2');

        const roomInfo = await matchmakingService.getRoomInfo('userA1');
        
        expect(roomInfo).toBeTruthy();
        expect(roomInfo.roomId).toBeTruthy();
        expect(roomInfo.users).toHaveLength(4);
    });

    it('deve lidar com múltiplos matches simultâneos', async () => {
        // Adiciona 8 usuários (4 pares)
        const users = [];
        for (let i = 1; i <= 8; i++) {
            users.push(`user${i}`);
            await matchmakingService.addToQueue(`user${i}`, `User${i}`);
        }

        // Verifica que foram criados 2 matches
        expect(matchmakingService.activeMatches.size).toBe(8);
        expect(matchmakingService.queueA.length).toBe(0);
        expect(matchmakingService.queueB.length).toBe(0);
    });

    it('deve persistir dados no Redis', async () => {
        await matchmakingService.addToQueue('user1', 'TestUser1');
        
        // Verifica se foi salvo no Redis
        const userData = await redisConnection.client.hGet('matchmaking:queue:A', 'user1');
        expect(userData).toBeTruthy();
        
        const parsedData = JSON.parse(userData);
        expect(parsedData.socketId).toBe('user1');
        expect(parsedData.username).toBe('TestUser1');
    });
}); 