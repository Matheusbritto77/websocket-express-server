var socket;  // A variável global para armazenar a instância do socket
let availableRooms = {};  // Inicializando a variável para armazenar as salas
const users = new Map();
let myStream;  // A variável para armazenar o stream local do usuário

// Função para gerar nome aleatório da sala
function generateRandomRoomName() {
    return 'room-' + Math.random().toString(36).substr(2, 8);
}

// Função para inicializar a conexão com o servidor
function initServerConnection(room) {
    socket = io({  // Estabelece a conexão com o servidor, utilizando a variável global `socket`
        query: {
            room: room
        }
    });

    socket.on('disconnect-user', function (data) {
        var user = users.get(data.id);
        if (user) {
            users.delete(data.id);
            user.selfDestroy();
        }
    });

    socket.on('call', function (data) {
        let user = new User(data.id);
        user.pc = createPeer(user);
        users.set(data.id, user);
        createOffer(user, socket);
    });

    socket.on('offer', function (data) {
        var user = users.get(data.id);
        if (user) {
            answerPeer(user, data.offer, socket);
        } else {
            let user = new User(data.id);
            user.pc = createPeer(user);
            users.set(data.id, user);
            answerPeer(user, data.offer, socket);
        }
    });

    socket.on('answer', function (data) {
        var user = users.get(data.id);
        if (user) {
            user.pc.setRemoteDescription(data.answer);
        }
    });

    socket.on('candidate', function (data) {
        var user = users.get(data.id);
        if (user) {
            user.pc.addIceCandidate(data.candidate);
        } else {
            let user = new User(data.id);
            user.pc = createPeer(user);
            user.pc.addIceCandidate(data.candidate);
            users.set(data.id, user);
        }
    });

    socket.on('connect', function () {
        showPlayers();
    });

    socket.on('connect_error', function (error) {
        console.log('Connection ERROR!');
        console.log(error);
        leave();
    });
}

// Função para entrar em uma sala
function enterInRoom(e) {
    e.preventDefault();

    // Verifica se o socket está inicializado
    if (!socket) {
        console.log("Socket não inicializado!");
        return;
    }

    // Gera um nome aleatório para a sala
    let roomName = generateRandomRoomName();

    // Verifica se existe uma sala com uma pessoa sozinha
    let availableRoom = Object.keys(availableRooms).find(room => availableRooms[room] === 'available');

    if (availableRoom) {
        // Se houver uma sala disponível com uma pessoa sozinha, conecta o novo cliente a essa sala
        roomName = availableRoom;
        availableRooms[roomName] = 'occupied';  // Marca a sala como ocupada
        console.log(`Sala ${roomName} ocupada por um novo cliente`);

        // Conecta o cliente à sala
        socket.emit('join-room', roomName);
    } else {
        // Se não houver uma sala disponível com uma pessoa sozinha, cria uma nova sala
        availableRooms[roomName] = 'available';  // Marca a sala como disponível
        console.log(`Sala ${roomName} criada e esperando por outro cliente`);

        // Conecta o cliente à sala criada
        socket.emit('join-room', roomName);
    }

    // Atualiza a interface para mostrar a sala
    showPlayers();  // Atualiza a interface para a sala
}


// Função para mostrar os jogadores
function showPlayers() {
    hidePanel('loading');
    hidePanel('fail');
    hidePanel('connect');
    showPanel('players');
}

// Função para exibir os painéis
function showPanel(name) {
    document.getElementById(name).classList.remove("hide");
}

// Função para esconder os painéis
function hidePanel(name) {
    document.getElementById(name).classList.add("hide");
}

// Função para adicionar mensagens no chat
function addMessage(message) {
    var parent = document.getElementById('message-printer');
    var p = document.createElement('p');
    p.innerHTML = message;

    parent.appendChild(p);
}

// Função para transmitir mensagens de chat
function broadcastChatMessage(e) {
    e.preventDefault();

    var message = document.getElementById('inputChatMessage').value;

    addMessage(message);

    for (var user of users.values()) {
        user.sendMessage(message);
    }

    document.getElementById('inputChatMessage').value = '';
}

// Função para deixar a sala
function leave() {
    socket.close();
    for (var user of users.values()) {
        user.selfDestroy();
    }
    users.clear();
    removeAllMessages();
    showForm();
}

// Função para remover todas as mensagens
function removeAllMessages() {
    var parent = document.getElementById('message-printer');
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

// Função para configurar o stream local do usuário
function setLocalPlayerStream() {
    document.getElementById('local-player').srcObject = myStream;
    document.getElementById('preview-player').srcObject = myStream;
}

// Função para mostrar o formulário
function showForm() {
    hidePanel('loading');
    hidePanel('fail');
    showPanel('connect');
    hidePanel('players');
}

document.addEventListener('DOMContentLoaded', function () {
    // Inicializa a conexão com o servidor
    initServerConnection(generateRandomRoomName()); // Gera e passa o nome da sala para a conexão

    document.getElementById('roomForm').addEventListener('submit', enterInRoom);
    document.getElementById('chatForm').addEventListener('submit', broadcastChatMessage);
    document.getElementById('leave').addEventListener('click', leave);

    navigator.mediaDevices.getUserMedia({ video: { height: 480, width: 640 }, audio: true })
        .then(function (stream) {
            myStream = stream;
            setLocalPlayerStream();
            showForm();
        }).catch(function (err) {
            console.log(err);
            showFail();
        });
}, false);
