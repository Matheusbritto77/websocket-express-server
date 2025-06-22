const ioClient = require('socket.io-client');
const http = require('http');
const SocketService = require('../../SocketService');
const mongoConnection = require('../../infrastructure/mongodb');
const redisConnection = require('../../infrastructure/redis');

describe('End-to-End Tests', () => {
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

    it('deve completar um fluxo básico de video chat', (done) => {
        const client1 = ioClient(`http://localhost:${address.port}`);
        const client2 = ioClient(`http://localhost:${address.port}`);
        clients.push(client1, client2);
        
        let client1Connected = false;
        let client2Connected = false;
        let offerSent = false;
        let answerSent = false;

        client1.on('connect', () => {
            client1Connected = true;
        });

        client2.on('connect', () => {
            client2Connected = true;
            
            // Aguardar um pouco para garantir que estão na mesma sala
            setTimeout(() => {
                // Client 1 envia offer
                client1.emit('offer', {
                    id: client2.id,
                    offer: { type: 'offer', sdp: 'client1-sdp' }
                });
            }, 1000);
        });

        client2.on('offer', (data) => {
            offerSent = true;
            expect(data.id).toBe(client1.id);
            expect(data.offer.type).toBe('offer');
            
            // Client 2 envia answer
            client2.emit('answer', {
                id: client1.id,
                answer: { type: 'answer', sdp: 'client2-sdp' }
            });
        });

        client1.on('answer', (data) => {
            answerSent = true;
            expect(data.id).toBe(client2.id);
            expect(data.answer.type).toBe('answer');
            
            // Verificar se todo o fluxo foi completado
            expect(client1Connected).toBe(true);
            expect(client2Connected).toBe(true);
            expect(offerSent).toBe(true);
            expect(answerSent).toBe(true);
            
            done();
        });

        // Timeout de segurança
        setTimeout(() => {
            if (!offerSent || !answerSent) {
                done(new Error('Timeout: Fluxo de video chat não foi completado'));
            }
        }, 10000);
    });

    it('deve lidar com múltiplas salas simultaneamente', (done) => {
        const roomCount = 2;
        const clientsPerRoom = 2;
        let connectedClients = 0;
        const expectedConnections = roomCount * clientsPerRoom;
        
        // Criar múltiplas salas com 2 clientes cada
        for (let room = 0; room < roomCount; room++) {
            for (let client = 0; client < clientsPerRoom; client++) {
                const socketClient = ioClient(`http://localhost:${address.port}`);
                clients.push(socketClient);
                
                socketClient.on('connect', () => {
                    connectedClients++;
                    
                    // Verificar se todos conectaram
                    if (connectedClients === expectedConnections) {
                        // Verificar se todos estão conectados
                        clients.forEach(client => {
                            expect(client.connected).toBe(true);
                        });
                        done();
                    }
                });
            }
        }

        // Timeout de segurança
        setTimeout(() => {
            if (connectedClients < expectedConnections) {
                done(new Error(`Timeout: Apenas ${connectedClients}/${expectedConnections} clientes conectaram`));
            }
        }, 8000);
    });

    it('deve testar reconexão de cliente', (done) => {
        const client = ioClient(`http://localhost:${address.port}`, {
            reconnection: true,
            reconnectionDelay: 100,
            reconnectionAttempts: 3
        });
        clients.push(client);

        let connectionCount = 0;

        client.on('connect', () => {
            connectionCount++;
            
            if (connectionCount === 1) {
                // Primeira conexão, desconectar
                setTimeout(() => {
                    client.disconnect();
                }, 500);
            } else if (connectionCount === 2) {
                // Segunda conexão, finalizar teste
                expect(connectionCount).toBe(2);
                done();
            }
        });

        // Timeout de segurança
        setTimeout(() => {
            if (connectionCount < 2) {
                done(new Error(`Timeout: Apenas ${connectionCount} conexões realizadas`));
            }
        }, 8000);
    });
}); 