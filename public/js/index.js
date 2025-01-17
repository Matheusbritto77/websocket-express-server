var myStream;
var socket;
const users = new Map();

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('roomForm').addEventListener('submit', enterInRoom);
    document.getElementById('chatForm').addEventListener('submit', broadcastChatMessage);
    document.getElementById('leave').addEventListener('click', leave);

    // Obter permissões de mídia (câmera e microfone)
    navigator.mediaDevices.getUserMedia({
        video: { height: 480, width: 640 },
        audio: true
    })
    .then(function(stream) {
        myStream = stream;
        setLocalPlayerStream();
        showForm();
    })
    .catch(function(err) {
        console.log('Erro ao acessar mídia: ', err);
        showFail();
    });
}, false);

function initServerConnection() {
    // URL explícita para o servidor WebSocket
    var socket = io('https://sket-soket-cvy6ep-8713dd-167-88-33-37.traefik.me');  // Adicione o URL correto do servidor

    // Desconectar usuário
    socket.on('disconnect-user', function(data) {
        var user = users.get(data.id);
        if (user) {
            users.delete(data.id);
            user.selfDestroy();
        }
    });

    // Chamada recebida de outro usuário
    socket.on('call', function(data) {
        let user = new User(data.id);
        user.pc = createPeer(user);
        users.set(data.id, user);

        createOffer(user, socket);
    });

    // Oferta recebida de outro usuário
    socket.on('offer', function(data) {
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

    // Resposta recebida de outro usuário
    socket.on('answer', function(data) {
        var user = users.get(data.id);
        if (user) {
            user.pc.setRemoteDescription(data.answer);
        }
    });

    // Candidato ICE recebido
    socket.on('candidate', function(data) {
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

    // Conexão estabelecida
    socket.on('connect', function() {
        showPlayers();
    });

    // Erro de conexão
    socket.on('connect_error', function(error) {
        console.log('Erro na Conexão WebSocket');
        console.log(error);
        leave();  // Chama a função leave se houver erro
    });

    return socket;
}

function enterInRoom(e) {
    e.preventDefault();
    socket = initServerConnection();
}

function broadcastChatMessage(e) {
    e.preventDefault();

    var message = document.getElementById('inputChatMessage').value;
    addMessage(message);

    // Enviar mensagem para todos os usuários
    for (var user of users.values()) {
        user.sendMessage(message);
    }

    document.getElementById('inputChatMessage').value = '';
}

function leave() {
    // Fechar a conexão WebSocket e destruir os usuários
    socket.close();
    for (var user of users.values()) {
        user.selfDestroy();
    }
    users.clear();
    removeAllMessages();
    showForm();
}
