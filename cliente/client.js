const WebSocket = require('ws');

// Conectar ao servidor WebSocket (sem especificar a porta)
const ws = new WebSocket('ws://sket-soket-cvy6ep-8713dd-167-88-33-37.traefik.me');

ws.on('open', () => {
  console.log('Conectado ao servidor WebSocket');
  ws.send('Olá, servidor!');
});

ws.on('message', (data) => {
  console.log('Mensagem recebida:', data);
});

ws.on('error', (error) => {
  console.error('Erro no WebSocket:', error);
});
