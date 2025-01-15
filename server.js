const WebSocket = require('ws');

// Criar o servidor WebSocket
const wss = new WebSocket.Server({ port: 443 });

console.log('Servidor WebSocket rodando na porta 443');

// Armazena conexões dos clientes
const clients = new Map();

wss.on('connection', (ws) => {
  console.log('Cliente conectado');

  // Gerar um identificador único para o cliente
  const clientId = `client_${Date.now()}`;
  clients.set(clientId, ws);
  console.log(`Cliente registrado com ID: ${clientId}`);

  // Enviar uma mensagem de boas-vindas com o ID do cliente
  ws.send(JSON.stringify({ event: 'connected', clientId }));

  // Quando receber uma mensagem do cliente
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Tratamento de eventos de sinalização
      switch (data.event) {
        case 'offer':
        case 'answer':
        case 'ice-candidate':
          // Redirecionar a mensagem para o destino
          const targetClient = clients.get(data.target);
          if (targetClient) {
            targetClient.send(JSON.stringify(data));
          } else {
            ws.send(
              JSON.stringify({
                event: 'error',
                message: 'Destinatário não encontrado',
              })
            );
          }
          break;

        default:
          console.log('Evento desconhecido:', data.event);
      }
    } catch (err) {
      console.error('Erro ao processar mensagem:', err);
    }
  });

  // Quando o cliente desconectar
  ws.on('close', () => {
    console.log(`Cliente desconectado: ${clientId}`);
    clients.delete(clientId);
  });
});
