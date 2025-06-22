// Setup global para todos os testes
require('dotenv').config();

// Configurações padrão para testes (fallback)
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || 3001;
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/video-chat-test';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || 6379;

// Configurar timeout global para testes
jest.setTimeout(30000);

// Configurar variáveis de ambiente para teste
process.env.NODE_ENV = 'test';

// Configurar console para testes
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
    // Silenciar logs durante os testes (opcional)
    if (process.env.SILENT_TESTS === 'true') {
        console.log = jest.fn();
        console.error = jest.fn();
    }
});

afterAll(() => {
    // Restaurar console
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
});

// Configurar handlers globais para erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
}); 