const WebSocket = require('ws');

class ChatServer {
  constructor(port = 443) {
    this.wss = new WebSocket.Server({ port });
    this.clients = new Map();
    console.log(`Servidor WebSocket rodando na porta ${port}`);
  }

  start() {
    this.wss.on('connection', (ws) => this.handleConnection(ws));
  }

  handleConnection(ws) {
    const clientId = this.generateClientId();
    console.log('Cliente conectado', clientId);

    // Armazenar a conexão do cliente
    this.clients.set(clientId, ws);

    // Enviar o ID do cliente para o próprio cliente
    ws.send(JSON.stringify({ event: 'connected', clientId }));

    // Quando o cliente enviar uma mensagem
    ws.on('message', (message) => this.handleMessage(clientId, message));

    // Quando o cliente se desconectar
    ws.on('close', () => this.handleClose(clientId));
  }

  handleMessage(clientId, message) {
    console.log(`Mensagem recebida de ${clientId}:`, message);

    // Procurar outro cliente para enviar a mensagem
    this.clients.forEach((client, otherClientId) => {
      if (otherClientId !== clientId) {
        // Enviar a mensagem para o outro cliente
        client.send(JSON.stringify({
          event: 'message',
          from: clientId,
          message
        }));
      }
    });
  }

  handleClose(clientId) {
    console.log(`Cliente desconectado: ${clientId}`);
    this.clients.delete(clientId);
  }

  generateClientId() {
    // Gera um ID único para o cliente
    return Math.random().toString(36).substr(2, 9);
  }
}

// Inicializar o servidor
const chatServer = new ChatServer();
chatServer.start();
