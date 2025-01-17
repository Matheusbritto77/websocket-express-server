const EVENT_CONNECTION = 'connection'
const EVENT_CALL = 'call'
const EVENT_OFFER = 'offer'
const EVENT_ANSWER = 'answer'
const EVENT_CANDIDATE = 'candidate'
const EVENT_DISCONNECT_USER = 'disconnect-user'
const EVENT_DISCONNECT = 'disconnect'
const EVENT_ENTER_ROOM = 'enter-room'

class SocketService {
    constructor(http) {
        this.init(http)
    }

    init(http) {
        this.io = require('socket.io')(http)
        this.waitingList = []  // Lista de espera para emparelhamento

        this.io.on(EVENT_CONNECTION, (socket) => {
            console.log(`${socket.id} connected`)

            // Coloca o cliente na lista de espera
            this.waitingList.push(socket)
            console.log(`Added ${socket.id} to the waiting list.`)

            // Quando houver dois clientes, emparelha-os em uma sala
            if (this.waitingList.length >= 2) {
                const user1 = this.waitingList.shift()
                const user2 = this.waitingList.shift()

                const roomName = `room-${Math.random().toString(36).substr(2, 9)}`  // Nome aleatório da sala
                console.log(`Creating room ${roomName} for ${user1.id} and ${user2.id}`)
                
                // Coloca os dois clientes na sala
                user1.join(roomName)
                user2.join(roomName)

                // Emitir evento para que os clientes saiam da tela de carregamento e entrem na sala
                user1.emit(EVENT_ENTER_ROOM, { id: user2.id, room: roomName })
                user2.emit(EVENT_ENTER_ROOM, { id: user1.id, room: roomName })

                // Inicia a chamada entre os dois clientes
                user1.emit(EVENT_CALL, { id: user2.id, room: roomName })
                user2.emit(EVENT_CALL, { id: user1.id, room: roomName })

                // Oferece para ambos
                user1.on(EVENT_OFFER, (data) => {
                    console.log(`${user1.id} offering ${data.id}`)
                    user2.emit(EVENT_OFFER, {
                        id: user1.id,
                        offer: data.offer
                    })
                })

                user2.on(EVENT_OFFER, (data) => {
                    console.log(`${user2.id} offering ${data.id}`)
                    user1.emit(EVENT_OFFER, {
                        id: user2.id,
                        offer: data.offer
                    })
                })

                user1.on(EVENT_ANSWER, (data) => {
                    console.log(`${user1.id} answering ${data.id}`)
                    user2.emit(EVENT_ANSWER, {
                        id: user1.id,
                        answer: data.answer
                    })
                })

                user2.on(EVENT_ANSWER, (data) => {
                    console.log(`${user2.id} answering ${data.id}`)
                    user1.emit(EVENT_ANSWER, {
                        id: user2.id,
                        answer: data.answer
                    })
                })

                user1.on(EVENT_CANDIDATE, (data) => {
                    console.log(`${user1.id} sending a candidate to ${data.id}`)
                    user2.emit(EVENT_CANDIDATE, {
                        id: user1.id,
                        candidate: data.candidate
                    })
                })

                user2.on(EVENT_CANDIDATE, (data) => {
                    console.log(`${user2.id} sending a candidate to ${data.id}`)
                    user1.emit(EVENT_CANDIDATE, {
                        id: user2.id,
                        candidate: data.candidate
                    })
                })

                // Tratamento de desconexão de usuários
                user1.on(EVENT_DISCONNECT, () => {
                    console.log(`${user1.id} disconnected`)
                    this.removeUserFromWaitingList(user1)
                    this.io.emit(EVENT_DISCONNECT_USER, { id: user1.id })
                    this.cleanupRoom(roomName)
                })

                user2.on(EVENT_DISCONNECT, () => {
                    console.log(`${user2.id} disconnected`)
                    this.removeUserFromWaitingList(user2)
                    this.io.emit(EVENT_DISCONNECT_USER, { id: user2.id })
                    this.cleanupRoom(roomName)
                })
            }
        })
    }

    // Função para remover um usuário da lista de espera
    removeUserFromWaitingList(user) {
        const index = this.waitingList.findIndex(socket => socket.id === user.id)
        if (index !== -1) {
            this.waitingList.splice(index, 1)
            console.log(`${user.id} removed from waiting list`)
        }
    }

    // Função para realizar a limpeza quando a sala está vazia
    cleanupRoom(roomName) {
        this.io.in(roomName).clients((error, clients) => {
            if (error) throw error;
            if (clients.length === 0) {
                console.log(`Room ${roomName} is empty. Deleting room.`)
                // Aqui, você pode fazer qualquer limpeza necessária, como liberar recursos
            }
        })
    }
}

module.exports = SocketService;
