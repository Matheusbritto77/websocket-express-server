var myStream;
var socket;
const users = new Map();

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('roomForm').addEventListener('submit', initServerConnection)
    document.getElementById('chatForm').addEventListener('submit', broadcastChatMessage);
    document.getElementById('leave').addEventListener('click', leave);

    navigator.mediaDevices.getUserMedia({ 
        video: {
            height: 480,
            width: 640
        }, 
        audio: true 
    })
    .then(function (stream) {
        myStream = stream;
        setLocalPlayerStream();
        showForm();
    }).catch(function (err) {
        console.log(err);
        showFail();
    });
}, false);

function initServerConnection() {
    socket = io(); // Não é necessário passar o nome da sala aqui

    socket.on('disconnect-user', function (data) {
        var user = users.get(data.id);
        if(user) {
            users.delete(data.id);
            user.selfDestroy();
        }
    });


    // Mostra a tela de loading quando o usuário está na lista de espera
    socket.on('waiting', function() {
        showLoading();
    });
    
    socket.on('call',  function (data) {
        let user = new User(data.id);
        user.pc = createPeer(user);
        users.set(data.id, user);

        createOffer(user, socket);
    });

    socket.on('offer',  function (data) {
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

    socket.on('answer',  function (data) {
        var user = users.get(data.id);
        if(user) {
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

    socket.on('connect_error', function(error) {
        console.log('Connection ERROR!');
        console.log(error);
        leave();
    });

    return socket;
}

function broadcastChatMessage(e) {
    e.preventDefault();

    var message = document.getElementById('inputChatMessage').value;

    addMessage(message);

    for(var user of users.values()) {
        user.sendMessage(message);
    }

    document.getElementById('inputChatMessage').value = '';
}

function leave() {
    socket.close();
    for(var user of users.values()) {
        user.selfDestroy();
    }
    users.clear();
    removeAllMessages();
    showForm();
}
