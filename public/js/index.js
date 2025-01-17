var getUserMedia;
var myStream;
var socket;
const users = new Map();

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('chatForm').addEventListener('submit', broadcastChatMessage);
    document.getElementById('leave').addEventListener('click', leave);

    // Obter o stream do usuário
    navigator.mediaDevices.getUserMedia({ 
        video: {
            height: 480,
            width: 640
        }, 
        audio: true 
    })
    .then(function (stream) {
        myStream = stream;
        setLocalPlayerStream(); // Função para exibir o vídeo local
        const roomName = generateRandomRoomName(); // Gerar nome aleatório para a sala
        initServerConnection(roomName); // Conectar ao servidor automaticamente com o nome da sala
    })
    .catch(function (err) {
        console.log(err);
        showFail(); // Função para mostrar erro de falha
    });
}, false);

function initServerConnection(room) {
    // Conexão com o nome da sala gerado aleatoriamente
    socket = io({
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

        createOffer(user, socket); // Enviar uma oferta para o novo usuário
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
        showPlayers(); // Função para exibir os jogadores
    });

    socket.on('connect_error', function(error) {
        console.log('Connection ERROR!');
        console.log(error);
        leave(); // Função para deixar o chat
    });
}

function broadcastChatMessage(e) {
    e.preventDefault();

    var message = document.getElementById('inputChatMessage').value;

    addMessage(message); // Função para adicionar a mensagem na interface

    for (var user of users.values()) {
        user.sendMessage(message); // Enviar mensagem para todos os usuários
    }

    document.getElementById('inputChatMessage').value = '';
}

function leave() {
    socket.close(); // Fechar conexão de socket
    for (var user of users.values()) {
        user.selfDestroy(); // Remover cada usuário da sala
    }
    users.clear();
    removeAllMessages(); // Limpar todas as mensagens
    showForm(); // Mostrar o formulário novamente
}

function generateRandomRoomName() {
    // Função para gerar um nome de sala aleatório
    return 'room_' + Math.random().toString(36).substring(2, 15);
}
