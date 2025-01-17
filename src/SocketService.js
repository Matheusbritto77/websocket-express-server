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
        this.waitingList = []; // Lista de espera
    }

    init(http) {
        this.io = require('socket.io')(http)
        

        this.io.on(EVENT_CONNECTION, (socket) => {
            const room = `room-${socket.id}` 
            console.log(`${socket.id} conectado`)
            this.waitingList.push(socket)
            socket.emit('waiting', { message: 'Você está na fila de espera.' })


            if (this.waitingList.length >= 2) {
                const user1 = this.waitingList.shift() // Pega o primeiro usuário
                const user2 = this.waitingList.shift() // Pega o segundo usuário
                // Cria uma sala para os dois usuários
                const roomName = `room-${user1.id}-${user2.id}`
                user1.join(roomName)
                user2.join(roomName)
                console.log(`Sala ${roomName} criada com ${user1.id} e ${user2.id}`)
                 // Notifica ambos os usuários para trocarem ofertas
                user1.emit(EVENT_CALL, { id: user2.id })
                user2.emit(EVENT_CALL, { id: user1.id })



            
            
            
             

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
                    console.log(`${socket.id} enviando candidato para ${data.id}`)
                    
                    // Verifique se o candidato foi enviado anteriormente, ou adicione lógica para esperar a resposta do outro lado
                    if (socket.handshake.query.ready) { 
                        socket.to(data.id).emit(EVENT_CANDIDATE, {
                            id: socket.id,
                            candidate: data.candidate
                        })
                    } else {
                        console.log(`${socket.id} aguardando resposta de ICE antes de enviar candidato`)
                    }
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