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

        const { v4: uuidv4 } = require('uuid'); // Importa UUID para nomes únicos de salas

        this.io.on(EVENT_CONNECTION, (socket) => {
            console.log(`New connection: ${socket.id}`);
        
            // Verificar se já existe uma sala com 1 usuário
            let availableRoom = null;
            for (const [room, users] of this.io.sockets.adapter.rooms) {
                if (users.size === 1 && !users.has(room)) { // Certificar-se de que a sala não é privada
                    availableRoom = room; // Encontrou uma sala com 1 usuário
                    break;
                }
            }
        
            if (availableRoom) {
                console.log(`New user entering existing room: ${availableRoom}`);
                socket.join(availableRoom);
                console.log('Requesting offers');
                socket.to(availableRoom).emit(EVENT_CALL, { id: socket.id });
            } else {
                // Cria uma nova sala pública com um nome único
                const newRoomName = `room-${uuidv4()}`;
                console.log(`New user creating room: ${newRoomName}`);
                socket.join(newRoomName);
                console.log('Requesting offers');
                socket.to(newRoomName).emit(EVENT_CALL, { id: socket.id });
            
            }
        


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
            
        })
    }
}

module.exports = (http) => {
    return new SocketService(http)
}