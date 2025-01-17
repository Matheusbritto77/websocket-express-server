const EVENT_CONNECTION = 'connection';
const EVENT_CALL = 'call';
const EVENT_OFFER = 'offer';
const EVENT_ANSWER = 'answer';
const EVENT_CANDIDATE = 'candidate';
const EVENT_DISCONNECT_USER = 'disconnect-user';
const EVENT_DISCONNECT = 'disconnect';
const EVENT_READY = 'ready'; // Novo evento indicando que o cliente está pronto

class SocketService {
    constructor(http) {
        this.waitingList = []; // Lista de espera
        this.init(http);
    }

    init(http) {
        this.io = require('socket.io')(http);

        this.io.on(EVENT_CONNECTION, (socket) => {
            console.log(`${socket.id} conectado`);

            // Adiciona o usuário à lista de espera
            this.waitingList.push(socket);

            // Notifica o usuário de que ele está esperando
            socket.emit('waiting', { message: 'Você está na fila de espera.' });

            // Verifica se há dois usuários na lista de espera
            if (this.waitingList.length >= 2) {
                this.startCall();
            }

            // Evento de oferta de conexão
            socket.on(EVENT_OFFER, (data) => this.handleOffer(socket, data));

            // Evento de resposta à oferta
            socket.on(EVENT_ANSWER, (data) => this.handleAnswer(socket, data));

            // Evento de candidato ICE
            socket.on(EVENT_CANDIDATE, (data) => this.handleCandidate(socket, data));

            // Evento de cliente pronto para troca de SDP
            socket.on(EVENT_READY, () => this.handleReady(socket));

            // Evento de desconexão
            socket.on(EVENT_DISCONNECT, () => this.handleDisconnect(socket));
        });
    }

    // Função que gerencia a fila e inicia a chamada entre dois usuários
    startCall() {
        const user1 = this.waitingList.shift(); // Pega o primeiro usuário
        const user2 = this.waitingList.shift(); // Pega o segundo usuário

        // Cria uma sala para os dois usuários
        const roomName = `room-${user1.id}-${user2.id}`;
        user1.join(roomName);
        user2.join(roomName);

        console.log(`Sala ${roomName} criada com os usuários ${user1.id} e ${user2.id}`);

        // Notifica que ambos os usuários estão prontos para trocar ofertas
        user1.emit(EVENT_CALL, { id: user2.id });
        user2.emit(EVENT_CALL, { id: user1.id });
    }

    // Função que lida com a oferta de conexão
    async handleOffer(socket, data) {
        console.log(`${socket.id} oferecendo para ${data.id}`);
        try {
            await socket.to(data.id).emit(EVENT_OFFER, {
                id: socket.id,
                offer: data.offer
            });
        } catch (error) {
            console.error(`Erro ao emitir oferta de ${socket.id}:`, error);
        }
    }

    // Função que lida com a resposta à oferta
    async handleAnswer(socket, data) {
        console.log(`${socket.id} respondendo para ${data.id}`);
        try {
            await socket.to(data.id).emit(EVENT_ANSWER, {
                id: socket.id,
                answer: data.answer
            });
        } catch (error) {
            console.error(`Erro ao emitir resposta de ${socket.id}:`, error);
        }
    }

    // Função que lida com os candidatos ICE
    async handleCandidate(socket, data) {
        console.log(`${socket.id} enviando candidato para ${data.id}`);
        try {
            await socket.to(data.id).emit(EVENT_CANDIDATE, {
                id: socket.id,
                candidate: data.candidate
            });
        } catch (error) {
            console.error(`Erro ao emitir candidato de ${socket.id}:`, error);
        }
    }

    // Função que lida quando o cliente está pronto para a troca de SDP
    handleReady(socket) {
        console.log(`${socket.id} está pronto para a troca de SDP.`);
    }

    // Função para remover o usuário da lista de espera quando ele se desconectar
    handleDisconnect(socket) {
        console.log(`${socket.id} desconectado.`);
        this.handleUserDisconnect(socket);
    }

    // Função auxiliar para remover o usuário da lista de espera
    handleUserDisconnect(socket) {
        const index = this.waitingList.indexOf(socket);
        if (index !== -1) {
            this.waitingList.splice(index, 1);
            console.log(`Usuário ${socket.id} removido da fila de espera.`);
        }
    }
}

module.exports = (http) => {
    return new SocketService(http);
};
