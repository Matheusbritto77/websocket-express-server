const express = require('express');
const WebSocket = require('ws');
const app = express();
const port = 80;

// Criar o servidor WebSocket
const wss = new WebSocket.Server({ noServer: true });

// Quando uma conexão WebSocket for feita
wss.on('connection', (ws) => {
  console.log('Cliente conectado');

  // Enviar uma mensagem de boas-vindas quando a conexão for estabelecida
  ws.send('Bem-vindo ao servidor WebSocket!');

  // Escutar por mensagens do cliente
  ws.on('message', (message) => {
    console.log(`Recebido do cliente: ${message}`);
    ws.send(`Você disse: ${message}`);  // Enviar uma resposta de volta ao cliente
  });

  // Quando o cliente desconectar
  ws.on('close', () => {
    console.log('Cliente desconectado');
  });
});

// Configuração de middleware e rotas
app.get('/server', (req, res) => {
  res.send('Hello World!');
});

// Lidar com a atualização do protocolo WebSocket para o servidor
app.server = app.listen(port, () => {
  console.log(`Server is running at https://websookt-servidor-prada8-6291bb-167-88-33-37.traefik.me:${port}`);
});

// Promover a atualização de conexões HTTP para WebSocket
app.server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
