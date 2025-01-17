const Redis = require('ioredis');
const redis = new Redis('redis://default:zlidxt9n9qdvlepv@167.88.33.37:6367'); // Conexão com o Redis

const EVENT_CONNECTION = 'connection';
const EVENT_CALL = 'call';
const EVENT_OFFER = 'offer';
const EVENT_ANSWER = 'answer';
const EVENT_CANDIDATE = 'candidate';
const EVENT_DISCONNECT_USER = 'disconnect-user';
const EVENT_DISCONNECT = 'disconnect';

class SocketService {
    constructor(http) {
        this.init(http);
    }

    async init(http) {
        this.io = require('socket.io')(http);

        this.io.on(EVENT_CONNECTION, async (socket) => {  // Torne o callback assíncrono
            const room = await this.getAvailableRoom(); // O servidor agora gera a sala automaticamente

            if (!room) {
                socket.disconnect();
            } else {
                console.log(`Novo usuário entrou na sala ${room}`);
                socket.join(room);
                console.log('Solicitando ofertas');
                socket.to(room).emit(EVENT_CALL, { id: socket.id });

                socket.on(EVENT_OFFER, (data) => {
                    console.log(`${socket.id} oferecendo para ${data.id}`);
                    socket.to(data.id).emit(EVENT_OFFER, {
                        id: socket.id,
                        offer: data.offer
                    });
                });

                socket.on(EVENT_ANSWER, (data) => {
                    console.log(`${socket.id} respondendo para ${data.id}`);
                    socket.to(data.id).emit(EVENT_ANSWER, {
                        id: socket.id,
                        answer: data.answer
                    });
                });

                socket.on(EVENT_CANDIDATE, (data) => {
                    console.log(`${socket.id} enviando candidato para ${data.id}`);
                    socket.to(data.id).emit(EVENT_CANDIDATE, {
                        id: socket.id,
                        candidate: data.candidate
                    });
                });

                socket.on(EVENT_DISCONNECT, async () => {
                    console.log(`${socket.id} desconectado`);
                    await this.handleDisconnect(socket.id, room);
                    this.io.emit(EVENT_DISCONNECT_USER, { id: socket.id });
                });
            }
        });
    }

    // Verifica se a sala está disponível e retorna o nome da sala ou null se não houver
    async getAvailableRoom() {
        const rooms = await redis.smembers('availableRooms'); // Recupera as salas disponíveis
        return rooms.length > 0 ? rooms[0] : null;  // Retorna a primeira sala disponível ou null
    }

    // Adiciona uma nova sala no Redis como disponível
    async addRoom(roomName) {
        await redis.sadd('availableRooms', roomName);  // Marca a sala como disponível
        console.log(`Sala ${roomName} criada e disponível`);
    }

    // Marca a sala como ocupada no Redis
    async markRoomAsOccupied(roomName) {
        await redis.srem('availableRooms', roomName);  // Remove da lista de salas disponíveis
        await redis.sadd('occupiedRooms', roomName);   // Marca como ocupada
        console.log(`Sala ${roomName} agora está ocupada`);
    }

    // Marca a sala como disponível no Redis
    async markRoomAsAvailable(roomName) {
        await redis.srem('occupiedRooms', roomName);  // Remove da lista de salas ocupadas
        await redis.sadd('availableRooms', roomName); // Marca como disponível novamente
        console.log(`Sala ${roomName} está disponível novamente`);
    }

    // Lida com a desconexão de um usuário e remove a sala se necessário
    async handleDisconnect(userId, roomName) {
        const userCount = await redis.scard(`room:${roomName}`);  // Conta o número de usuários na sala

        if (userCount <= 1) {
            await redis.srem('occupiedRooms', roomName); // Remove da lista de salas ocupadas
            console.log(`Sala ${roomName} foi removida devido à desconexão do usuário ${userId}`);
        } else {
            await this.markRoomAsAvailable(roomName); // Marca como disponível
        }
    }
}

module.exports = (http) => {
    return new SocketService(http);
}
