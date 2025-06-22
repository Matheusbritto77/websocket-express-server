const ioClient = require('socket.io-client');
const http = require('http');
const SocketService = require('../../SocketService');
const mongoConnection = require('../../infrastructure/mongodb');
const redisConnection = require('../../infrastructure/redis');

describe('Performance and Load Tests', () => {
    let server, address;

    beforeAll(async () => {
        server = http.createServer();
        await mongoConnection.connect();
        await redisConnection.connect();
        SocketService(server);
        
        await new Promise(resolve => {
            server.listen(0, () => {
                address = server.address();
                resolve();
            });
        });
    });

    afterAll(async () => {
        await new Promise(resolve => server.close(resolve));
        await mongoConnection.disconnect();
        await redisConnection.disconnect();
    });

    it('deve suportar múltiplas conexões simultâneas', async () => {
        const clientCount = 5;
        const clients = [];
        const connectionPromises = [];

        // Criar múltiplos clientes
        for (let i = 0; i < clientCount; i++) {
            const client = ioClient(`http://localhost:${address.port}`);
            clients.push(client);
            
            const promise = new Promise((resolve) => {
                client.on('connect', () => {
                    resolve();
                });
            });
            connectionPromises.push(promise);
        }

        // Aguardar todas as conexões
        await Promise.all(connectionPromises);

        // Verificar se todos estão conectados
        clients.forEach(client => {
            expect(client.connected).toBe(true);
        });

        // Limpar
        clients.forEach(client => client.disconnect());
    }, 15000);

    it('deve processar mensagens WebRTC rapidamente', async () => {
        const client1 = ioClient(`http://localhost:${address.port}`);
        const client2 = ioClient(`http://localhost:${address.port}`);
        
        const messageCount = 10;
        let receivedCount = 0;
        const startTime = Date.now();

        await new Promise(resolve => {
            client1.on('connect', () => {
                client2.on('connect', () => {
                    client2.on('offer', () => {
                        receivedCount++;
                        if (receivedCount === messageCount) {
                            const endTime = Date.now();
                            const duration = endTime - startTime;
                            
                            // Verificar performance (menos de 10 segundos para 10 mensagens)
                            expect(duration).toBeLessThan(10000);
                            expect(receivedCount).toBe(messageCount);
                            resolve();
                        }
                    });

                    // Enviar múltiplas mensagens rapidamente
                    for (let i = 0; i < messageCount; i++) {
                        client1.emit('offer', {
                            id: client2.id,
                            offer: { type: 'offer', sdp: `test-sdp-${i}` }
                        });
                    }
                });
            });
        });

        client1.disconnect();
        client2.disconnect();
    }, 15000);

    it('deve manter estabilidade com reconexões frequentes', async () => {
        const reconnectCount = 5;
        const client = ioClient(`http://localhost:${address.port}`);
        let successfulReconnects = 0;

        for (let i = 0; i < reconnectCount; i++) {
            await new Promise(resolve => {
                client.on('connect', () => {
                    successfulReconnects++;
                    client.disconnect();
                    setTimeout(resolve, 100);
                });
            });
        }

        expect(successfulReconnects).toBe(reconnectCount);
    }, 15000);
}); 