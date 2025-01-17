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

        this.io.on(EVENT_CONNECTION, (socket) => {  
            this.handleConnection(socket); // Mova a lógica assíncrona para uma função separada
        });
    }

    async handleConnection(socket) {
        try {
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
        } catch (error) {
            console.error('Erro ao processar a conexão do socket:', error);
            socket.disconnect();  // Se ocorrer um erro, desconecta o usuário
        }
    }

    // Verifica se a sala está disponível e retorna o nome da sala ou null se não houver
    async getAvailableRoom() {
        try {
            const rooms = await redis.smembers('availableRooms'); // Recupera as salas disponíveis
            return rooms.length > 0 ? rooms[0] : null;  // Retorna a primeira sala disponível ou null
        } catch (error) {
            console.error('Erro ao obter salas disponíveis:', error);
            return null;  // Retorna null em caso de erro
        }
    }

    // Adiciona uma nova sala no Redis como disponível
    async addRoom(roomName) {
        try {
            await redis.sadd('availableRooms', roomName);  // Marca a sala como disponível
            console.log(`Sala ${roomName} criada e disponível`);
        } catch (error) {
            console.error('Erro ao adicionar sala:', error);
        }
    }

    // Marca a sala como ocupada no Redis
    async markRoomAsOccupied(roomName) {
        try {
            await redis.srem('availableRooms', roomName);  // Remove da lista de salas disponíveis
            await redis.sadd('occupiedRooms', roomName);   // Marca como ocupada
            console.log(`Sala ${roomName} agora está ocupada`);
        } catch (error) {
            console.error('Erro ao marcar sala como ocupada:', error);
        }
    }

    // Marca a sala como disponível no Redis
    async markRoomAsAvailable(roomName) {
        try {
            await redis.srem('occupiedRooms', roomName);  // Remove da lista de salas ocupadas
            await redis.sadd('availableRooms', roomName); // Marca como disponível novamente
            console.log(`Sala ${roomName} está disponível novamente`);
        } catch (error) {
            console.error('Erro ao marcar sala como disponível:', error);
        }
    }

    // Lida com a desconexão de um usuário e remove a sala se necessário
    async handleDisconnect(userId, roomName) {
        try {
            const userCount = await redis.scard(`room:${roomName}`);  // Conta o número de usuários na sala

            if (userCount <= 1) {
                await redis.srem('occupiedRooms', roomName); // Remove da lista de salas ocupadas
                console.log(`Sala ${roomName} foi removida devido à desconexão do usuário ${userId}`);
            } else {
                await this.markRoomAsAvailable(roomName); // Marca como disponível
            }
        } catch (error) {
            console.error('Erro ao lidar com a desconexão do usuário:', error);
        }
    }
}

module.exports = (http) => {
    return new SocketService(http);
};
