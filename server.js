const WebSocket = require('ws');

class ChatServer {
  constructor(port = 443) {
    this.wss = new WebSocket.Server({ port });
    this.clients = new Map(); // Mapeia clientId para a conexão WebSocket
    this.waitingClients = []; // Lista de clientes aguardando para serem emparelhados
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

    // Tentar emparelhar com outro cliente
    this.matchClients(ws, clientId);
  }

  handleMessage(clientId, message) {
    console.log(`Mensagem recebida de ${clientId}:`, message);

    // Tenta parsear a mensagem recebida, caso não seja um JSON válido, será ignorado
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch (error) {
      console.error('Mensagem inválida:', message);
      return;
    }

    // Procurar outro cliente conectado no mesmo par
    const pairId = this.clients.get(clientId).pairId;
    const pair = this.clients.get(pairId);

    if (pair) {
      // Enviar a mensagem para o cliente par
      pair.send(JSON.stringify({
        event: 'message',
        from: clientId,
        message: parsedMessage.message
      }));
    }
  }

  handleClose(clientId) {
    console.log(`Cliente desconectado: ${clientId}`);
    
    // Remover cliente da lista de espera ou do mapeamento de conexões
    const client = this.clients.get(clientId);
    const pairId = client.pairId;

    // Notificar o cliente par que a conexão foi encerrada
    if (pairId) {
      const pair = this.clients.get(pairId);
      if (pair) {
        pair.send(JSON.stringify({
          event: 'disconnected',
          message: `Cliente ${clientId} desconectou.`
        }));
      }
    }

    this.clients.delete(clientId);

    // Tentar reemparelhar
    this.repairConnections();
  }

  matchClients(ws, clientId) {
    if (this.waitingClients.length > 0) {
      // Emparelhar o cliente com outro cliente da lista de espera
      const pairedClientId = this.waitingClients.pop();
      const pairedWs = this.clients.get(pairedClientId);

      // Atualizar os IDs dos pares
      this.clients.get(clientId).pairId = pairedClientId;
      this.clients.get(pairedClientId).pairId = clientId;

      // Enviar evento de conexão para os dois clientes
      ws.send(JSON.stringify({ event: 'connected', clientId: pairedClientId }));
      pairedWs.send(JSON.stringify({ event: 'connected', clientId }));

      console.log(`Clientes emparelhados: ${clientId} <-> ${pairedClientId}`);
    } else {
      // Caso contrário, colocar o cliente na lista de espera
      this.waitingClients.push(clientId);
      console.log(`Cliente ${clientId} esperando por outro cliente.`);
    }
  }

  repairConnections() {
    // Verifica se há clientes restantes na lista de espera
    if (this.waitingClients.length > 1) {
      // Emparelhar os dois primeiros clientes na lista de espera
      const clientId1 = this.waitingClients.shift();
      const clientId2 = this.waitingClients.shift();
      
      const ws1 = this.clients.get(clientId1);
      const ws2 = this.clients.get(clientId2);

      this.clients.get(clientId1).pairId = clientId2;
      this.clients.get(clientId2).pairId = clientId1;

      ws1.send(JSON.stringify({ event: 'connected', clientId: clientId2 }));
      ws2.send(JSON.stringify({ event: 'connected', clientId: clientId1 }));

      console.log(`Clientes emparelhados: ${clientId1} <-> ${clientId2}`);
    }
  }

  generateClientId() {
    // Gera um ID único para o cliente
    return Math.random().toString(36).substr(2, 9);
  }
}

// Inicializar o servidor
const chatServer = new ChatServer();
chatServer.start();
