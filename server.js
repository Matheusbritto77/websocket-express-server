const WebSocket = require('ws');
const express = require('express');
const app = express();
const port = 80;

// Criar o servidor HTTP
const server = app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

// Criar o servidor WebSocket
const wss = new WebSocket.Server({ noServer: true });

// Função para iniciar o servidor WebSocket
const startWebSocketServer = () => {
  // Quando uma conexão WebSocket for feita
  wss.on('connection', (ws) => {
    console.log('Cliente conectado');

    // Enviar uma mensagem de boas-vindas quando a conexão for estabelecida
    ws.send(JSON.stringify({ event: 'connected', message: 'Bem-vindo ao servidor WebSocket!' }));

    // Escutar por mensagens do cliente (Exemplo para sinalização de vídeo)
    ws.on('message', (message) => {
      console.log(`Recebido do cliente: ${message}`);
      ws.send(JSON.stringify({ event: 'message', message: `Você disse: ${message}` }));
    });

    // Quando o cliente desconectar
    ws.on('close', () => {
      console.log('Cliente desconectado');
      ws.send(JSON.stringify({ event: 'disconnected', message: 'Cliente desconectado' }));
    });
  });
};

// Lidar com a atualização do protocolo WebSocket para o servidor
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
