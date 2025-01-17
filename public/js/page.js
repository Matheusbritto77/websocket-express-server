var myStream
var socket
const users = new Map()

document.addEventListener('DOMContentLoaded', function() {

    // Remover a necessidade de formulário para nome de sala
    document.getElementById('chatForm').addEventListener('submit', broadcastChatMessage)
    document.getElementById('leave').addEventListener('click', leave)

    // Solicitar permissão para acessar câmera e microfone
    navigator.mediaDevices.getUserMedia({ video: {
        height: 480,
        width: 640
    }, audio: true })
    .then(function (stream) {
        myStream = stream
        setLocalPlayerStream()
        showWaitingMessage()  // Exibir a mensagem de espera
    }).catch(function (err) {
        console.log(err)
        showFail()
    })
}, false)

function initServerConnection() {
    // Remover a necessidade de passar a sala como parâmetro
    var socket = io()

    socket.on('disconnect-user', function (data) {
        var user = users.get(data.id)
        if(user) {
            users.delete(data.id)
            user.selfDestroy()
        }
    })
    
    socket.on('call', function (data) {
        let user = new User(data.id)
        user.pc = createPeer(user)
        users.set(data.id, user)

        createOffer(user, socket)
    })

    socket.on('offer', function (data) {
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

    socket.on('answer', function (data) {
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

function showWaitingMessage() {
    showPanel('loading')
    hidePanel('fail')
    hidePanel('connect')
    hidePanel('players')

    // Exibir mensagem de espera
    var waitingMessage = document.createElement('p')
    waitingMessage.innerHTML = 'Aguardando um parceiro para emparelhar...'
    document.getElementById('loading').appendChild(waitingMessage)
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

function showLoading() {
    showPanel('loading')
    hidePanel('fail')
    hidePanel('connect')
    hidePanel('players')
}

function showFail() {
    hidePanel('loading')
    showPanel('fail')
    hidePanel('connect')
    hidePanel('players')
}

function showForm() {
    hidePanel('loading')
    hidePanel('fail')
    showPanel('connect')
    hidePanel('players')
}

function showPlayers() {
    hidePanel('loading')
    hidePanel('fail')
    hidePanel('connect')
    showPanel('players')
}

function addVideoPlayer(stream) {
    var template = new DOMParser().parseFromString('<div class="col"><div class="videoWrapper card"><video class="responsive-video" autoplay></video></div></div>', 'text/html')
    template.getElementsByTagName('video')[0].srcObject = stream
    var  divPlayer = template.body.childNodes[0]
    document.getElementById('players-row').appendChild(divPlayer)
    return divPlayer
}

function hidePanel(name) {
    document.getElementById(name).classList.add("hide")
}

function showPanel(name) {
    document.getElementById(name).classList.remove("hide")
}

function setLocalPlayerStream() {
    document.getElementById('local-player').srcObject = myStream
    document.getElementById('preview-player').srcObject = myStream
}

function removeAllMessages() {
    var parent = document.getElementById('message-printer')
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

function addMessage(message) {
    var parent = document.getElementById('message-printer')
    var p = document.createElement('p')
    p.innerHTML = message

    parent.appendChild(p)
}
