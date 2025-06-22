const SERVER_PORT = process.env.PORT || 3000;
const App = require('./src/App');

// Inicia o servidor
const server = App(SERVER_PORT);

console.log(`🚀 Servidor iniciado na porta ${SERVER_PORT}`);
console.log(`📊 API disponível em: http://localhost:${SERVER_PORT}`);
console.log(`🎯 Matchmaking stats: http://localhost:${SERVER_PORT}/api/matchmaking/stats`);