const WebSocket = require('ws');

// Criar o servidor WebSocket diretamente (sem servidor HTTP)
const wss = new WebSocket.Server({ port: 80 });

console.log('Servidor WebSocket rodando na porta 80');

// Quando uma conexão WebSocket for feita
wss.on('connection', (ws) => {
  console.log('Cliente conectado');

  // Enviar uma mensagem de boas-vindas quando a conexão for estabelecida
  ws.send(JSON.stringify({ event: 'connected', message: 'Bem-vindo ao servidor WebSocket!' }));

  // Escutar por mensagens do cliente
  ws.on('message', (message) => {
    console.log(`Recebido do cliente: ${message}`);
    ws.send(JSON.stringify({ event: 'message', message: `Você disse: ${message}` }));
  });

  // Quando o cliente desconectar
  ws.on('close', () => {
    console.log('Cliente desconectado');
  });
});
