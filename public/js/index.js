var getUserMedia
var myStream
var socket
const users = new Map()

document.addEventListener('DOMContentLoaded', function() {

    document.getElementById('roomForm').addEventListener('submit', enterInRoom)
    document.getElementById('chatForm').addEventListener('submit', broadcastChatMessage)
    document.getElementById('leave').addEventListener('click', leave)

    navigator.mediaDevices.getUserMedia({ video: {
        height: 480,
        width: 640
    }, audio: true })
    .then(function (stream) {
        myStream = stream
        setLocalPlayerStream()
        showForm()
    }).catch(function (err) {
        console.log(err)
        showFail()
    })
}, false)

function initServerConnection(room) {
    var socket = io({
        query : {
            room: room
        }
    })

    socket.on('disconnect-user', function (data) {
        var user = users.get(data.id)
        if(user) {
            users.delete(data.id)
            user.selfDestroy()
        }
    })
    
    socket.on('call',  function (data) {
        let user = new User(data.id)
        user.pc = createPeer(user)
        users.set(data.id, user)

        createOffer(user, socket)
    })

    socket.on('offer',  function (data) {
        var user = users.get(data.id)
        if (user) {
            answerPeer(user, data.offer, socket)
        } else {
            let user = new User(data.id)
            user.pc = createPeer(user)
            users.set(data.id, user)
            answerPeer(user, data.offer, socket)
        }
    })

    socket.on('answer',  function (data) {
        var user = users.get(data.id)
        if(user) {
            user.pc.setRemoteDescription(data.answer)
        }
    })

    socket.on('candidate', function (data) {
        var user = users.get(data.id)
        if (user) {
            user.pc.addIceCandidate(data.candidate)
        } else {
            let user = new User(data.id)
            user.pc = createPeer(user)
            user.pc.addIceCandidate(data.candidate)
            users.set(data.id, user)
        }
    })
    
    socket.on('connect', function () {
        showPlayers()
    })

    socket.on('connect_error', function(error) {
        console.log('Connection ERROR!')
        console.log(error)
        leave()
    })
    
    return socket
}

var waitingQueue = [];  // Lista de espera para os clientes

// Função para gerar um nome aleatório para a sala
function generateRandomRoomName() {
    return 'room-' + Math.random().toString(36).substring(2, 8);  // Gera um nome aleatório
}

function enterInRoom(e) {
    e.preventDefault();

    // Adiciona o cliente na lista de espera
    waitingQueue.push(socket);

    // Verifica se existem pelo menos 2 clientes esperando
    if (waitingQueue.length >= 2) {
        // Gera um nome aleatório para a sala
        const roomName = generateRandomRoomName();

        // Pega os dois primeiros clientes da lista de espera
        const client1 = waitingQueue.shift();
        const client2 = waitingQueue.shift();

        // Conecta os clientes na sala
        client1.emit('join-room', roomName);
        client2.emit('join-room', roomName);

        // Cria a sala no servidor (você precisa configurar isso no seu servidor)
        socket = initServerConnection(roomName);  // Conecta o cliente atual
        client1.emit('connect', roomName);
        client2.emit('connect', roomName);
    } else {
        // Se não tiver 2 clientes, o cliente ficará aguardando
        console.log('Aguardando outros clientes para formar a sala...');
    }
}


function broadcastChatMessage(e) {
    e.preventDefault()

    var message = document.getElementById('inputChatMessage').value

    addMessage(message)

    for(var user of users.values()) {
        user.sendMessage(message)
    }

    document.getElementById('inputChatMessage').value = ''
}

function leave() {
    socket.close()
    for(var user of users.values()) {
        user.selfDestroy()
    }
    users.clear()
    removeAllMessages()
    showForm()
}