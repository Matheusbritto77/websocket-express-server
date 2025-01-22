const EVENT_CONNECTION = 'connection'
const EVENT_CALL = 'call'
const EVENT_OFFER = 'offer'
const EVENT_ANSWER = 'answer'
const EVENT_CANDIDATE = 'candidate'
const EVENT_DISCONNECT_USER = 'disconnect-user'

const EVENT_DISCONNECT = 'disconnect'

class SocketService {
    constructor(http) {
        this.init(http)
    }

    init(http) {
        this.io = require('socket.io')(http)

        this.io.on(EVENT_CONNECTION, (socket) => {
           

            // Verificar se já existe uma sala com 1 usuário
            let availableRoom = null;
            for (const [room, users] of this.io.sockets.adapter.rooms) {
                if (users.size === 1) {
                    availableRoom = room; // Encontrou uma sala com 1 usuário
                    break;
                }
            }


             if (availableRoom) {
                socket.join(availableRoom);
                console.log(`User ${socket.id} joined existing room ${availableRoom}`);
                socket.to(availableRoom).emit(EVENT_CALL, { id: socket.id });

                // Emitir evento para que o cliente execute 'showPlayers'
        socket.emit('connect', () => {
            // Chame a função showPlayers aqui no servidor, se necessário
            console.log('Executing showPlayers on the client-side');
        });

            } else {
                // Caso contrário, cria uma nova sala
                const roomName = `room-${socket.id}`;
                socket.join(roomName);
                console.log(`User ${socket.id} created and joined new room ${roomName}`);
                socket.to(roomName).emit(EVENT_CALL, { id: socket.id });

                 // Emitir evento para que o cliente execute 'showPlayers'
        socket.emit('connect', () => {
            // Chame a função showPlayers aqui no servidor, se necessário
            console.log('Executing showPlayers on the client-side');
        });

                

                socket.on(EVENT_OFFER, (data) => {
                    console.log(`${socket.id} offering ${data.id}`)
                    socket.to(data.id).emit(EVENT_OFFER, {
                        id: socket.id,
                        offer: data.offer
                    })
                })

                socket.on(EVENT_ANSWER, (data) => {
                    console.log(`${socket.id} answering ${data.id}`)
                    socket.to(data.id).emit(EVENT_ANSWER, {
                        id: socket.id,
                        answer: data.answer
                    })
                })

                socket.on(EVENT_CANDIDATE, (data) => {
                    console.log(`${socket.id} sending a candidate to ${data.id}`)
                    socket.to(data.id).emit(EVENT_CANDIDATE, {
                        id: socket.id,
                        candidate: data.candidate
                    })
                })

                socket.on(EVENT_DISCONNECT, () => {
                    console.log(`${socket.id} disconnected`)
                    this.io.emit(EVENT_DISCONNECT_USER, {
                        id: socket.id
                    })
                })
            }
        })
    }
}

module.exports = (http) => {
    return new SocketService(http)
}