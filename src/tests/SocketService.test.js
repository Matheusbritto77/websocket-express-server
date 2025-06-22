const ioClient = require('socket.io-client');
const http = require('http');
const SocketService = require('../SocketService');
const mongoConnection = require('../infrastructure/mongodb');
const redisConnection = require('../infrastructure/redis');

describe('SocketService Integration Test', () => {
    let server, address;
    let clientSocket;

    beforeAll(async () => {
        server = http.createServer();
        await mongoConnection.connect();
        await redisConnection.connect();
        SocketService(server);
        
        await new Promise(resolve => {
            server.listen(0, () => {
                address = server.address();
                console.log(`Servidor iniciado na porta ${address.port}`);
                resolve();
            });
        });
    });

    afterAll(async () => {
        // Desconectar cliente se estiver conectado
        if (clientSocket && clientSocket.connected) {
            clientSocket.disconnect();
        }
        
        // Aguardar um pouco antes de fechar o servidor
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Fechar servidor e conexões
        await new Promise(resolve => server.close(resolve));
        await mongoConnection.disconnect();
        await redisConnection.disconnect();
    });

    beforeEach(() => {
        clientSocket = null;
    });

    afterEach(() => {
        if (clientSocket && clientSocket.connected) {
            clientSocket.disconnect();
        }
    });

    it('deve conectar um cliente e processar eventos básicos', (done) => {
        clientSocket = ioClient(`http://localhost:${address.port}`, {
            timeout: 10000,
            forceNew: true
        });

        clientSocket.on('connect', () => {
            console.log('Socket conectado');
            expect(clientSocket.connected).toBe(true);
            
            // Simular entrada em sala
            clientSocket.emit('join-room', { roomId: 'test-room' });
            
            // Aguardar um pouco e verificar se ainda está conectado
            setTimeout(() => {
                expect(clientSocket.connected).toBe(true);
                done();
            }, 1000);
        });

        // Timeout de segurança
        setTimeout(() => {
            if (!clientSocket.connected) {
                done(new Error('Timeout: Cliente não conectou'));
            }
        }, 8000);
    });

    it('deve processar eventos WebRTC básicos', (done) => {
        clientSocket = ioClient(`http://localhost:${address.port}`, {
            timeout: 10000,
            forceNew: true
        });

        clientSocket.on('connect', () => {
            // Simular envio de offer
            clientSocket.emit('offer', {
                id: 'test-target-id',
                offer: { type: 'offer', sdp: 'test-sdp' }
            });
            
            // Simular envio de answer
            clientSocket.emit('answer', {
                id: 'test-target-id',
                answer: { type: 'answer', sdp: 'test-answer-sdp' }
            });
            
            // Simular envio de candidate
            clientSocket.emit('candidate', {
                id: 'test-target-id',
                candidate: { candidate: 'test-candidate' }
            });
            
            // Verificar se ainda está conectado após envios
            setTimeout(() => {
                expect(clientSocket.connected).toBe(true);
                done();
            }, 1000);
        });

        // Timeout de segurança
        setTimeout(() => {
            if (!clientSocket.connected) {
                done(new Error('Timeout: Cliente não conectou'));
            }
        }, 8000);
    });
}); 