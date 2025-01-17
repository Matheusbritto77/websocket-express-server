const EVENT_CONNECTION = 'connection';
const EVENT_CALL = 'call';
const EVENT_OFFER = 'offer';
const EVENT_ANSWER = 'answer';
const EVENT_CANDIDATE = 'candidate';
const EVENT_DISCONNECT = 'disconnect';

class SocketService {
    constructor(http) {
        this.waitingList = [];
        this.init(http);
    }

    init(http) {
        this.io = require('socket.io')(http);

        this.io.on(EVENT_CONNECTION, (socket) => {
            console.log(`${socket.id} conectado`);
            this.waitingList.push(socket);

            socket.emit('waiting', { message: 'Você está na fila de espera.' });

            if (this.waitingList.length >= 2) {
                const [user1, user2] = this.waitingList.splice(0, 2);
                const roomName = `room-${user1.id}-${user2.id}`;
                this.createRoom(user1, user2, roomName);
            }

            socket.on(EVENT_OFFER, (data) => this.handleOffer(socket, data));
            socket.on(EVENT_ANSWER, (data) => this.handleAnswer(socket, data));
            socket.on(EVENT_CANDIDATE, (data) => this.handleCandidate(socket, data));
            socket.on(EVENT_DISCONNECT, () => this.handleDisconnect(socket));
        });
    }

    createRoom(user1, user2, roomName) {
        user1.join(roomName);
        user2.join(roomName);
        console.log(`Sala ${roomName} criada com ${user1.id} e ${user2.id}`);
        user1.emit(EVENT_CALL, { id: user2.id });
        user2.emit(EVENT_CALL, { id: user1.id });
    }

    handleOffer(socket, data) {
        console.log(`${socket.id} oferecendo para ${data.id}`);
        socket.to(data.id).emit(EVENT_OFFER, { id: socket.id, offer: data.offer });
    }

    handleAnswer(socket, data) {
        console.log(`${socket.id} respondendo para ${data.id}`);
        socket.to(data.id).emit(EVENT_ANSWER, { id: socket.id, answer: data.answer });
    }

    handleCandidate(socket, data) {
        console.log(`${socket.id} enviando candidato para ${data.id}`);
        socket.to(data.id).emit(EVENT_CANDIDATE, { id: socket.id, candidate: data.candidate });
    }

    handleDisconnect(socket) {
        console.log(`${socket.id} desconectado.`);
        this.waitingList = this.waitingList.filter(user => user.id !== socket.id);
    }
}

module.exports = (http) => new SocketService(http);
