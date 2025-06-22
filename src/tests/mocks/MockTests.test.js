const ioClient = require('socket.io-client');
const http = require('http');
const SocketService = require('../../SocketService');
const mongoConnection = require('../../infrastructure/mongodb');
const redisConnection = require('../../infrastructure/redis');

// Mock dos repositórios
jest.mock('../../repositories/UserRepository');
jest.mock('../../repositories/RoomRepository');

const MockUserRepository = require('../../repositories/UserRepository');
const MockRoomRepository = require('../../repositories/RoomRepository');

describe('Mock Tests', () => {
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
        // Limpar mocks
        jest.clearAllMocks();
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

    it('deve usar mocks para testar criação de usuário', (done) => {
        // Configurar mock
        MockUserRepository.prototype.createUser = jest.fn().mockResolvedValue(true);
        MockUserRepository.prototype.findUserBySocketId = jest.fn().mockResolvedValue({
            socketId: 'test-socket-id',
            roomId: 'test-room-id',
            username: 'testuser',
            isOnline: true
        });

        const client = ioClient(`http://localhost:${address.port}`);
        clients.push(client);

        client.on('connect', () => {
            // Simular evento que cria usuário
            client.emit('join-room', { roomId: 'test-room-id' });
            
            setTimeout(() => {
                // Verificar se o mock foi chamado
                expect(MockUserRepository.prototype.createUser).toHaveBeenCalled();
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

    it('deve usar mocks para testar criação de sala', (done) => {
        // Configurar mock
        MockRoomRepository.prototype.createRoom = jest.fn().mockResolvedValue(true);
        MockRoomRepository.prototype.findRoomById = jest.fn().mockResolvedValue({
            roomId: 'test-room-id',
            userCount: 1,
            isActive: true,
            createdAt: new Date()
        });

        const client = ioClient(`http://localhost:${address.port}`);
        clients.push(client);

        client.on('connect', () => {
            // Simular evento que cria sala
            client.emit('join-room', { roomId: 'test-room-id' });
            
            setTimeout(() => {
                // Verificar se o mock foi chamado
                expect(MockRoomRepository.prototype.createRoom).toHaveBeenCalled();
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

    it('deve usar mocks para testar eventos WebRTC', (done) => {
        // Configurar mocks
        MockUserRepository.prototype.findUserBySocketId = jest.fn().mockResolvedValue({
            socketId: 'test-socket-id',
            roomId: 'test-room-id',
            username: 'testuser',
            isOnline: true
        });

        const client = ioClient(`http://localhost:${address.port}`);
        clients.push(client);

        client.on('connect', () => {
            // Simular eventos WebRTC
            client.emit('offer', {
                id: 'target-socket-id',
                offer: { type: 'offer', sdp: 'test-sdp' }
            });
            
            client.emit('answer', {
                id: 'target-socket-id',
                answer: { type: 'answer', sdp: 'test-answer-sdp' }
            });
            
            client.emit('candidate', {
                id: 'target-socket-id',
                candidate: { candidate: 'test-candidate' }
            });
            
            setTimeout(() => {
                // Verificar se o mock foi chamado
                expect(MockUserRepository.prototype.findUserBySocketId).toHaveBeenCalled();
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

    it('deve usar mocks para testar desconexão', (done) => {
        // Configurar mocks
        MockUserRepository.prototype.setUserOffline = jest.fn().mockResolvedValue(true);
        MockRoomRepository.prototype.decrementUserCount = jest.fn().mockResolvedValue(true);

        const client = ioClient(`http://localhost:${address.port}`);
        clients.push(client);

        client.on('connect', () => {
            // Simular desconexão
            setTimeout(() => {
                client.disconnect();
                
                setTimeout(() => {
                    // Verificar se os mocks foram chamados
                    expect(MockUserRepository.prototype.setUserOffline).toHaveBeenCalled();
                    expect(MockRoomRepository.prototype.decrementUserCount).toHaveBeenCalled();
                    done();
                }, 1000);
            }, 1000);
        });

        // Timeout de segurança
        setTimeout(() => {
            if (!client.connected) {
                done(new Error('Timeout: Cliente não conectou'));
            }
        }, 8000);
    });

    it('deve usar mocks para testar cenários de erro', (done) => {
        // Configurar mock para simular erro
        MockUserRepository.prototype.createUser = jest.fn().mockRejectedValue(
            new Error('Erro simulado de criação de usuário')
        );

        const client = ioClient(`http://localhost:${address.port}`);
        clients.push(client);

        client.on('connect', () => {
            // Simular evento que pode causar erro
            client.emit('join-room', { roomId: 'test-room-id' });
            
            setTimeout(() => {
                // Verificar se o mock foi chamado
                expect(MockUserRepository.prototype.createUser).toHaveBeenCalled();
                // O sistema deve continuar funcionando mesmo com erro
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