const SERVER_PORT = process.env.PORT || 3000;
const OmegleServer = require('./src/OmegleServer');

// Inicia o servidor Omegle
const server = new OmegleServer(SERVER_PORT);
server.start();

console.log(`🚀 Servidor Omegle iniciado na porta ${SERVER_PORT}`);
console.log(`📊 API disponível em: http://localhost:${SERVER_PORT}`);
console.log(`🎯 Estatísticas: http://localhost:${SERVER_PORT}/api/stats`);