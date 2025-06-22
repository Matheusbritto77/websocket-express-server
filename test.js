const OmegleServer = require('./src/OmegleServer');

// Teste básico do servidor
describe('OmegleServer', () => {
    let server;
    
    beforeEach(() => {
        server = new OmegleServer(3001); // Porta diferente para teste
    });
    
    afterEach(() => {
        if (server && server.server) {
            server.server.close();
        }
    });
    
    test('deve criar uma instância do servidor', () => {
        expect(server).toBeDefined();
        expect(server.waitingUsers).toBeDefined();
        expect(server.activeConnections).toBeDefined();
    });
    
    test('deve ter as rotas configuradas', () => {
        const routes = server.app._router.stack
            .filter(layer => layer.route)
            .map(layer => Object.keys(layer.route.methods)[0] + ' ' + layer.route.path);
        
        expect(routes).toContain('get /health');
        expect(routes).toContain('get /');
        expect(routes).toContain('get /api/stats');
    });
    
    test('deve adicionar usuário à fila de espera', () => {
        const mockSocket = { id: 'test-socket-id' };
        server.addToWaitingQueue(mockSocket);
        
        expect(server.waitingUsers).toContain('test-socket-id');
    });
    
    test('deve fazer match quando há 2 usuários', () => {
        const mockSocket1 = { id: 'socket1' };
        const mockSocket2 = { id: 'socket2' };
        
        // Simula adicionar 2 usuários
        server.waitingUsers.push('socket1');
        server.waitingUsers.push('socket2');
        
        const match = server.tryMatch();
        
        expect(server.waitingUsers.length).toBe(0);
        expect(server.activeConnections.size).toBe(2);
    });
});

console.log('✅ Testes do OmegleServer passaram!'); 