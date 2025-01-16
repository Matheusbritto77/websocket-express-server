const WebSocket = require('ws');

// Conectar ao servidor WebSocket
const ws = new WebSocket('ws://sket-soket-cvy6ep-8713dd-167-88-33-37.traefik.me');

// Quando a conexão for aberta
ws.on('open', () => {
  console.log('Conectado ao servidor WebSocket');
  
  // Enviar uma mensagem para o servidor, solicitando a criação de uma sala
  ws.send(JSON.stringify({ event: 'startMeet' }));
});

// Quando uma mensagem for recebida do servidor
ws.on('message', (data) => {
  console.log('Mensagem recebida do servidor:', data);

  // Verifica se a mensagem contém um evento "connected" (indica que o cliente foi registrado com sucesso)
  const parsedData = JSON.parse(data);
  if (parsedData.event === 'connected') {
    console.log('Cliente conectado com ID:', parsedData.clientId);
  }
});

// Quando ocorrer um erro
ws.on('error', (error) => {
  console.error('Erro no WebSocket:', error);
});

// Quando a conexão for fechada
ws.on('close', () => {
  console.log('Conexão WebSocket fechada');
});
