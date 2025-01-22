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





const fs = require('fs');
const path = require('path');

// Caminho do arquivo onde as salas serão armazenadas
const roomsFilePath = path.join(__dirname, 'activeRooms.txt');

// Função principal chamada quando o evento 'enterInRoom' ocorre
function enterInRoom(e) {
    e.preventDefault();

    let room;

    // Verifica se há salas disponíveis no arquivo
    const activeRooms = readRoomsFromFile();

    if (activeRooms.length > 0) {
        // Se houver, pega a primeira sala e remove do arquivo
        room = activeRooms.pop();
        console.log(`Reusing room: ${room}`);
        writeRoomsToFile(activeRooms); // Atualiza o arquivo sem a sala reutilizada
    } else {
        // Caso não tenha nenhuma sala armazenada, gera uma nova
        room = generateRandomRoomName();
        console.log(`Generated new room: ${room}`);
        writeRoomsToFile([room]); // Armazena a nova sala no arquivo
    }

    // Chama a função initServerConnection passando o nome da sala
    socket = initServerConnection(room);
}

// Função para ler salas do arquivo
function readRoomsFromFile() {
    try {
        if (fs.existsSync(roomsFilePath)) {
            const data = fs.readFileSync(roomsFilePath, 'utf-8');
            return data ? data.split('\n').filter(room => room.trim()) : [];
        }
    } catch (err) {
        console.error('Error reading rooms from file:', err);
    }
    return [];
}

// Função para escrever salas no arquivo
function writeRoomsToFile(rooms) {
    try {
        fs.writeFileSync(roomsFilePath, rooms.join('\n'), 'utf-8');
    } catch (err) {
        console.error('Error writing rooms to file:', err);
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