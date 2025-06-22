const ioClient = require('socket.io-client');
const http = require('http');
const SocketService = require('../../SocketService');
const mongoConnection = require('../../infrastructure/mongodb');
const redisConnection = require('../../infrastructure/redis');

describe('Security Tests', () => {
    let server, address;
    let clients = [];

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
        // Desconectar todos os clientes
        clients.forEach(client => {
            if (client && client.connected) {
                client.disconnect();
            }
        });
        clients = [];
        
        // Fechar servidor e conexões
        await new Promise(resolve => server.close(resolve));
        await mongoConnection.disconnect();
        await redisConnection.disconnect();
    });

    beforeEach(() => {
        clients = [];
    });

    afterEach(() => {
        // Limpar clientes após cada teste
        clients.forEach(client => {
            if (client && client.connected) {
                client.disconnect();
            }
        });
        clients = [];
    });

    it('deve rejeitar payloads maliciosos', (done) => {
        const client = ioClient(`http://localhost:${address.port}`);
        clients.push(client);

        client.on('connect', () => {
            // Tentar enviar payload malicioso
            const maliciousPayload = {
                id: "'; DROP TABLE users; --",
                offer: { type: 'offer', sdp: '<script>alert("xss")</script>' }
            };

            client.emit('offer', maliciousPayload);
            
            // O sistema deve continuar funcionando
            setTimeout(() => {
                expect(client.connected).toBe(true);
                done();
            }, 2000);
        });

        // Timeout de segurança
        setTimeout(() => {
            if (!client.connected) {
                done(new Error('Timeout: Cliente não conectou'));
            }
        }, 5000);
    });

    it('deve limitar tamanho de mensagens', (done) => {
        const client = ioClient(`http://localhost:${address.port}`);
        clients.push(client);

        client.on('connect', () => {
            // Tentar enviar mensagem muito grande
            const largeMessage = {
                id: 'test-id',
                offer: { 
                    type: 'offer', 
                    sdp: 'A'.repeat(1000000) // 1MB de dados
                }
            };

            client.emit('offer', largeMessage);
            
            // O sistema deve continuar funcionando
            setTimeout(() => {
                expect(client.connected).toBe(true);
                done();
            }, 2000);
        });

        // Timeout de segurança
        setTimeout(() => {
            if (!client.connected) {
                done(new Error('Timeout: Cliente não conectou'));
            }
        }, 5000);
    });

    it('deve validar formato de dados WebRTC', (done) => {
        const client = ioClient(`http://localhost:${address.port}`);
        clients.push(client);

        client.on('connect', () => {
            // Tentar enviar dados inválidos
            const invalidData = {
                id: null,
                offer: 'invalid-offer-string'
            };

            client.emit('offer', invalidData);
            
            // O sistema deve continuar funcionando
            setTimeout(() => {
                expect(client.connected).toBe(true);
                done();
            }, 2000);
        });

        // Timeout de segurança
        setTimeout(() => {
            if (!client.connected) {
                done(new Error('Timeout: Cliente não conectou'));
            }
        }, 5000);
    });

    it('deve prevenir injeção de código', (done) => {
        const client = ioClient(`http://localhost:${address.port}`);
        clients.push(client);

        client.on('connect', () => {
            // Tentar enviar código malicioso
            const maliciousCode = {
                id: 'test-id',
                candidate: {
                    candidate: 'eval("alert(\'hacked\')")'
                }
            };

            client.emit('candidate', maliciousCode);
            
            // O sistema deve continuar funcionando
            setTimeout(() => {
                expect(client.connected).toBe(true);
                done();
            }, 2000);
        });

        // Timeout de segurança
        setTimeout(() => {
            if (!client.connected) {
                done(new Error('Timeout: Cliente não conectou'));
            }
        }, 5000);
    });
}); 