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






// Função principal chamada quando o evento 'enterInRoom' ocorre
function enterInRoom(e) {
    e.preventDefault();

    let room;
    let activeRooms = [];

    // Verifica se há alguma sala no array
    if (activeRooms.length > 1) {
        // Se houver, pega o primeiro nome de sala e remove do array
        room = activeRooms.pop();
        console.log(`Reusing room: ${room}`);
    } else {
        // Caso não tenha nenhuma sala armazenada, gera uma nova e adiciona ao array
        room = generateRandomRoomName();
        activeRooms.push(room); // Adiciona o nome da sala ao array
        console.log(`Generated and added new room: ${room}`);
    }

    // Chama a função initServerConnection passando o nome da sala
    socket = initServerConnection(room);

    // Limpa o array após o uso da sala
    if (activeRooms.length > 1) {
        activeRooms = []; // Limpa o array de salas
    }
}

// Função para gerar um nome aleatório para a sala
function generateRandomRoomName() {
    return 'room-' + Math.random().toString(36).substr(2, 9); // Gera uma string aleatória
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