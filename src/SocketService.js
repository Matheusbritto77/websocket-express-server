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
        this.waitingList = [] // Lista de espera
    }

    init(http) {
        this.io = require('socket.io')(http)

        this.io.on(EVENT_CONNECTION, (socket) => {
            const room = `room-${socket.id}`
            console.log(`${socket.id} conectado`)
            this.waitingList.push(socket)
            socket.emit('waiting', { message: 'Você está na fila de espera.' })

            // Quando houver pelo menos dois usuários na lista, cria uma sala
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

                // Evento de oferta
                user1.on(EVENT_OFFER, (data) => {
                    console.log(`${user1.id} oferecendo para ${data.id}`)
                    user2.emit(EVENT_OFFER, {
                        id: user1.id,
                        offer: data.offer
                    })
                })

                user2.on(EVENT_OFFER, (data) => {
                    console.log(`${user2.id} oferecendo para ${data.id}`)
                    user1.emit(EVENT_OFFER, {
                        id: user2.id,
                        offer: data.offer
                    })
                })

                // Evento de resposta
                user1.on(EVENT_ANSWER, (data) => {
                    console.log(`${user1.id} respondendo para ${data.id}`)
                    user2.emit(EVENT_ANSWER, {
                        id: user1.id,
                        answer: data.answer
                    })
                })

                user2.on(EVENT_ANSWER, (data) => {
                    console.log(`${user2.id} respondendo para ${data.id}`)
                    user1.emit(EVENT_ANSWER, {
                        id: user2.id,
                        answer: data.answer
                    })
                })

                // Evento de candidato
                user1.on(EVENT_CANDIDATE, (data) => {
                    console.log(`${user1.id} enviando candidato para ${data.id}`)
                    user2.emit(EVENT_CANDIDATE, {
                        id: user1.id,
                        candidate: data.candidate
                    })
                })

                user2.on(EVENT_CANDIDATE, (data) => {
                    console.log(`${user2.id} enviando candidato para ${data.id}`)
                    user1.emit(EVENT_CANDIDATE, {
                        id: user2.id,
                        candidate: data.candidate
                    })
                })

                // Evento de desconexão
                user1.on(EVENT_DISCONNECT, () => {
                    console.log(`${user1.id} desconectado`)
                    this.io.emit(EVENT_DISCONNECT_USER, { id: user1.id })
                })

                user2.on(EVENT_DISCONNECT, () => {
                    console.log(`${user2.id} desconectado`)
                    this.io.emit(EVENT_DISCONNECT_USER, { id: user2.id })
                })
            }
        })
    }
}

module.exports = (http) => {
    return new SocketService(http)
}
