const WebSocket = require('ws');

// Conectar ao servidor WebSocket
const ws = new WebSocket('ws://localhost:8080');

// Evento de conexão
ws.on('open', () => {
  console.log('Conectado ao servidor WebSocket');
  ws.send('Olá, servidor!');
});

// Receber mensagens do servidor
ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Mensagem recebida do servidor:', message);
});

// Evento de erro
ws.on('error', (error) => {
  console.error('Erro no WebSocket:', error);
});
