const redisConnection = require('../infrastructure/redis');

describe('RedisConnection', () => {
    beforeAll(async () => {
        await redisConnection.connect();
    });

    afterAll(async () => {
        await redisConnection.disconnect();
    });

    it('deve conectar ao Redis', () => {
        expect(redisConnection.isReady()).toBe(true);
    });

    it('deve setar e obter um valor', async () => {
        await redisConnection.client.set('test-key', 'test-value');
        const value = await redisConnection.client.get('test-key');
        expect(value).toBe('test-value');
    });

    it('deve deletar um valor', async () => {
        await redisConnection.client.set('test-key', 'delete-me');
        await redisConnection.client.del('test-key');
        const value = await redisConnection.client.get('test-key');
        expect(value).toBeNull();
    });
}); 