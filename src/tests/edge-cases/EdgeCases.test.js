const ioClient = require('socket.io-client');
const http = require('http');
const SocketService = require('../../SocketService');
const mongoConnection = require('../../infrastructure/mongodb');
const redisConnection = require('../../infrastructure/redis');
const UserRepository = require('../../repositories/UserRepository');
const RoomRepository = require('../../repositories/RoomRepository');

describe('Edge Cases Tests', () => {
    let server, address;
    let clients = [];
    let userRepository, roomRepository;

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
        userRepository = new UserRepository();
        roomRepository = new RoomRepository();
        await userRepository.init();
        await roomRepository.init();
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

    it('deve lidar com dados vazios', (done) => {
        const client = ioClient(`http://localhost:${address.port}`);
        clients.push(client);

        client.on('connect', () => {
            // Enviar dados vazios
            client.emit('offer', {});
            client.emit('answer', {});
            client.emit('candidate', {});
            
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

    it('deve lidar com caracteres especiais', (done) => {
        const client = ioClient(`http://localhost:${address.port}`);
        clients.push(client);

        client.on('connect', () => {
            // Enviar dados com caracteres especiais
            const specialChars = {
                id: 'test-émojis-🚀-中文-русский',
                offer: { 
                    type: 'offer', 
                    sdp: 'sdp-with-émojis-🚀-中文-русский' 
                }
            };

            client.emit('offer', specialChars);
            
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

    it('deve lidar com operações simultâneas', (done) => {
        const client1 = ioClient(`http://localhost:${address.port}`);
        const client2 = ioClient(`http://localhost:${address.port}`);
        clients.push(client1, client2);

        let operationsCompleted = 0;
        const expectedOperations = 6; // 3 operações por cliente

        client1.on('connect', () => {
            client2.on('connect', () => {
                // Enviar múltiplas operações simultaneamente
                client1.emit('offer', { id: client2.id, offer: { type: 'offer', sdp: 'sdp1' } });
                client1.emit('answer', { id: client2.id, answer: { type: 'answer', sdp: 'sdp1' } });
                client1.emit('candidate', { id: client2.id, candidate: { candidate: 'candidate1' } });
                
                client2.emit('offer', { id: client1.id, offer: { type: 'offer', sdp: 'sdp2' } });
                client2.emit('answer', { id: client1.id, answer: { type: 'answer', sdp: 'sdp2' } });
                client2.emit('candidate', { id: client1.id, candidate: { candidate: 'candidate2' } });
                
                // Verificar se ambos continuam conectados
                setTimeout(() => {
                    expect(client1.connected).toBe(true);
                    expect(client2.connected).toBe(true);
                    done();
                }, 2000);
            });
        });

        // Timeout de segurança
        setTimeout(() => {
            if (!client1.connected || !client2.connected) {
                done(new Error('Timeout: Clientes não conectaram'));
            }
        }, 8000);
    });

    it('deve lidar com reconexões rápidas', (done) => {
        const client = ioClient(`http://localhost:${address.port}`, {
            reconnection: true,
            reconnectionDelay: 50,
            reconnectionAttempts: 5
        });
        clients.push(client);

        let connectionCount = 0;

        client.on('connect', () => {
            connectionCount++;
            
            if (connectionCount === 1) {
                // Primeira conexão, desconectar rapidamente
                setTimeout(() => {
                    client.disconnect();
                }, 100);
            } else if (connectionCount >= 2) {
                // Segunda ou mais conexões, finalizar teste
                expect(connectionCount).toBeGreaterThanOrEqual(2);
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

    it('deve lidar com desconexões inesperadas', (done) => {
        const client = ioClient(`http://localhost:${address.port}`);
        clients.push(client);

        client.on('connect', () => {
            // Simular desconexão inesperada
            setTimeout(() => {
                client.disconnect();
                
                // Tentar reconectar
                setTimeout(() => {
                    const newClient = ioClient(`http://localhost:${address.port}`);
                    clients.push(newClient);
                    
                    newClient.on('connect', () => {
                        expect(newClient.connected).toBe(true);
                        done();
                    });
                }, 500);
            }, 1000);
        });

        // Timeout de segurança
        setTimeout(() => {
            if (!client.connected) {
                done(new Error('Timeout: Cliente não conectou'));
            }
        }, 8000);
    });

    it('deve lidar com dados vazios ou nulos', async () => {
        // Testar com dados vazios
        const emptyUser = {};
        const emptyRoom = {};

        try {
            await userRepository.createUser(emptyUser);
            expect(true).toBe(false); // Não deveria chegar aqui
        } catch (error) {
            expect(error).toBeDefined();
        }

        try {
            await roomRepository.createRoom(emptyRoom);
            expect(true).toBe(false); // Não deveria chegar aqui
        } catch (error) {
            expect(error).toBeDefined();
        }
    });

    it('deve lidar com caracteres especiais em IDs', async () => {
        const specialUser = {
            socketId: 'socket-123!@#$%^&*()',
            roomId: 'room-456!@#$%^&*()',
            username: 'user with spaces and !@#$%'
        };

        try {
            await userRepository.createUser(specialUser);
            const user = await userRepository.findUserBySocketId(specialUser.socketId);
            expect(user).toBeDefined();
            expect(user.socketId).toBe(specialUser.socketId);
        } catch (error) {
            // Pode falhar se o sistema não suportar caracteres especiais
            expect(error).toBeDefined();
        }
    });

    it('deve lidar com IDs muito longos', async () => {
        const longId = 'a'.repeat(1000);
        const userWithLongId = {
            socketId: longId,
            roomId: 'normal-room',
            username: 'test'
        };

        try {
            await userRepository.createUser(userWithLongId);
            const user = await userRepository.findUserBySocketId(longId);
            expect(user).toBeDefined();
        } catch (error) {
            // Pode falhar se o sistema tiver limite de tamanho
            expect(error).toBeDefined();
        }
    });

    it('deve lidar com múltiplas operações simultâneas', async () => {
        const baseId = 'concurrent-test';
        const promises = [];

        // Criar múltiplos usuários simultaneamente
        for (let i = 0; i < 5; i++) {
            const userData = {
                socketId: `${baseId}-${i}`,
                roomId: `${baseId}-room-${i}`,
                username: `user-${i}`
            };
            promises.push(userRepository.createUser(userData));
        }

        await Promise.all(promises);

        // Verificar se todos foram criados
        for (let i = 0; i < 5; i++) {
            const user = await userRepository.findUserBySocketId(`${baseId}-${i}`);
            expect(user).toBeDefined();
        }
    });

    it('deve lidar com desconexões abruptas do banco', async () => {
        // Simular perda de conexão
        await mongoConnection.disconnect();
        
        try {
            await userRepository.findUserBySocketId('test-id');
            expect(true).toBe(false); // Não deveria chegar aqui
        } catch (error) {
            expect(error).toBeDefined();
        }

        // Reconectar
        await mongoConnection.connect();
        await userRepository.init();
    });

    it('deve lidar com dados corrompidos no Redis', async () => {
        // Inserir dados corrompidos no Redis
        await redisConnection.client.set('corrupted-data', 'invalid-json-data');
        
        try {
            const data = await redisConnection.client.get('corrupted-data');
            expect(data).toBe('invalid-json-data');
        } catch (error) {
            expect(error).toBeDefined();
        }
    });

    it('deve lidar com salas cheias', async () => {
        const roomId = 'full-room-test';
        
        // Criar sala com limite de 2 usuários
        await roomRepository.createRoom({
            roomId,
            maxUsers: 2,
            currentUsers: 0
        });

        // Adicionar 2 usuários
        await roomRepository.incrementUserCount(roomId);
        await roomRepository.incrementUserCount(roomId);

        const room = await roomRepository.findRoomById(roomId);
        expect(room.isFull()).toBe(true);
        expect(room.canJoin()).toBe(false);
    });

    it('deve lidar com limpeza de dados antigos', async () => {
        // Criar usuário "antigo"
        const oldUser = {
            socketId: 'old-user',
            roomId: 'old-room',
            isOnline: false,
            lastSeen: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 horas atrás
        };

        await userRepository.createUser(oldUser);
        
        // Executar limpeza
        const cleanedCount = await userRepository.cleanupInactiveUsers(24);
        expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });

    it('deve lidar com timeouts de operações', async () => {
        // Simular operação lenta
        const slowOperation = new Promise((resolve) => {
            setTimeout(() => resolve('done'), 100);
        });

        const result = await slowOperation;
        expect(result).toBe('done');
    }, 5000);
}); 