const ioClient = require('socket.io-client');
const http = require('http');
const SocketService = require('../../SocketService');
const mongoConnection = require('../../infrastructure/mongodb');
const redisConnection = require('../../infrastructure/redis');

describe('WebSocket Integration Tests', () => {
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

    it('deve conectar dois clientes na mesma sala', (done) => {
        const client1 = ioClient(`http://localhost:${address.port}`);
        const client2 = ioClient(`http://localhost:${address.port}`);
        clients.push(client1, client2);

        let connectionCount = 0;

        client1.on('connect', () => {
            connectionCount++;
            if (connectionCount === 2) {
                expect(client1.connected).toBe(true);
                expect(client2.connected).toBe(true);
                done();
            }
        });

        client2.on('connect', () => {
            connectionCount++;
            if (connectionCount === 2) {
                expect(client1.connected).toBe(true);
                expect(client2.connected).toBe(true);
                done();
            }
        });

        // Timeout de segurança
        setTimeout(() => {
            if (connectionCount < 2) {
                done(new Error('Timeout: Clientes não conectaram'));
            }
        }, 5000);
    });

    it('deve trocar mensagens WebRTC entre dois clientes', (done) => {
        const client1 = ioClient(`http://localhost:${address.port}`);
        const client2 = ioClient(`http://localhost:${address.port}`);
        clients.push(client1, client2);

        let offerReceived = false;
        let answerReceived = false;

        client1.on('connect', () => {
            client2.on('connect', () => {
                // Aguardar um pouco para garantir que estão na mesma sala
                setTimeout(() => {
                    // Client 1 envia offer
                    client1.emit('offer', {
                        id: client2.id,
                        offer: { type: 'offer', sdp: 'test-sdp' }
                    });
                }, 1000);
            });
        });

        client2.on('offer', (data) => {
            offerReceived = true;
            expect(data.id).toBe(client1.id);
            expect(data.offer.type).toBe('offer');
            
            // Client 2 envia answer
            client2.emit('answer', {
                id: client1.id,
                answer: { type: 'answer', sdp: 'test-answer-sdp' }
            });
        });

        client1.on('answer', (data) => {
            answerReceived = true;
            expect(data.id).toBe(client2.id);
            expect(data.answer.type).toBe('answer');
            
            if (offerReceived && answerReceived) {
                done();
            }
        });

        // Timeout de segurança
        setTimeout(() => {
            if (!offerReceived || !answerReceived) {
                done(new Error('Timeout: Mensagens WebRTC não foram trocadas'));
            }
        }, 8000);
    });

    it('deve trocar ICE candidates entre clientes', (done) => {
        const client1 = ioClient(`http://localhost:${address.port}`);
        const client2 = ioClient(`http://localhost:${address.port}`);
        clients.push(client1, client2);

        let candidate1Received = false;
        let candidate2Received = false;

        client1.on('connect', () => {
            client2.on('connect', () => {
                setTimeout(() => {
                    // Client 1 envia candidate
                    client1.emit('candidate', {
                        id: client2.id,
                        candidate: { candidate: 'client1-candidate' }
                    });
                }, 1000);
            });
        });

        client2.on('candidate', (data) => {
            candidate1Received = true;
            expect(data.id).toBe(client1.id);
            expect(data.candidate.candidate).toBe('client1-candidate');
            
            // Client 2 envia candidate
            client2.emit('candidate', {
                id: client1.id,
                candidate: { candidate: 'client2-candidate' }
            });
        });

        client1.on('candidate', (data) => {
            candidate2Received = true;
            expect(data.id).toBe(client2.id);
            expect(data.candidate.candidate).toBe('client2-candidate');
            
            if (candidate1Received && candidate2Received) {
                done();
            }
        });

        // Timeout de segurança
        setTimeout(() => {
            if (!candidate1Received || !candidate2Received) {
                done(new Error('Timeout: ICE candidates não foram trocados'));
            }
        }, 8000);
    });

    it('deve notificar desconexão de usuário', (done) => {
        const client1 = ioClient(`http://localhost:${address.port}`);
        const client2 = ioClient(`http://localhost:${address.port}`);
        clients.push(client1, client2);

        let client1Connected = false;
        let client2Connected = false;
        let disconnectNotified = false;

        client1.on('connect', () => {
            client1Connected = true;
        });

        client2.on('connect', () => {
            client2Connected = true;
            
            // Aguardar conexões e depois desconectar client1
            setTimeout(() => {
                client1.disconnect();
            }, 2000);
        });

        client2.on('disconnect-user', (data) => {
            disconnectNotified = true;
            expect(data.id).toBe(client1.id);
            done();
        });

        // Timeout de segurança
        setTimeout(() => {
            if (!disconnectNotified) {
                done(new Error('Timeout: Notificação de desconexão não recebida'));
            }
        }, 10000);
    });
}); 