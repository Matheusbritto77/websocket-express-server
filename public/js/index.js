var getUserMedia
var myStream
const users = new Map()
let isInQueue = false
let currentRoomId = null
let socket = null

// Função para mostrar erros de forma mais amigável
function showError(message) {
    console.error('Erro:', message);
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// Função para verificar se o navegador suporta WebRTC
function checkWebRTCSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError('Seu navegador não suporta WebRTC. Por favor, use um navegador moderno.');
        return false;
    }
    return true;
}

// Função para inicializar o Socket.IO
function initializeSocket() {
    try {
        socket = io({
            timeout: 20000,
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling']
        });

        // Eventos do sistema de matchmaking
        socket.on('queue-update', function (data) {
            console.log('Posição na fila:', data.position, 'Fila:', data.queue);
            showLoading();
            // Atualiza a tela de loading com informações da fila
            updateLoadingMessage(`Procurando usuários... Posição: ${data.position} (Fila ${data.queue})`);
        });

        socket.on('match-found', function (data) {
            console.log('Match encontrado!', data);
            log('info', 'Match encontrado!', data);
            
            // Atualizar mensagem de loading
            updateLoadingMessage('Conectando usuários...');
            
            // Armazenar informações da sala
            currentRoomId = data.roomId;
            
            // Mostrar a interface da sala
            showPlayers();
            updateRoomStatus(data);
        });

        socket.on('next-requested', function (data) {
            console.log('Próximo usuário solicitado:', data);
            showLoading();
            updateLoadingMessage('Procurando próximo usuário...');
            // Volta para a fila automaticamente
            enterQueue();
        });

        socket.on('queue-left', function (data) {
            console.log('Saiu da fila:', data);
            isInQueue = false;
            showForm();
        });

        // Eventos WebRTC existentes
        socket.on('disconnect-user', function (data) {
            var user = users.get(data.id)
            if(user) {
                users.delete(data.id)
                user.selfDestroy()
                // Se estava em uma sala, volta para a fila
                if (currentRoomId) {
                    enterQueue();
                }
            }
        })
        
        socket.on('call',  function (data) {
            log('info', 'Chamada recebida:', data);
            
            // Mostrar a interface da sala
            showPlayers();
            updateRoomStatus(data);
            
            // Para o novo sistema, data.users contém os outros usuários
            if (data.users && Array.isArray(data.users)) {
                data.users.forEach(userData => {
                    // Verificar se já existe uma conexão com este usuário
                    if (users.has(userData.socketId)) {
                        log('warn', `Conexão já existe com ${userData.socketId} - ignorando`);
                        return;
                    }
                    
                    let user = new User(userData.socketId)
                    user.pc = createPeer(user)
                    users.set(userData.socketId, user)
                    createOffer(user, socket)
                });
            } else {
                // Fallback para o sistema antigo
                if (users.has(data.id)) {
                    log('warn', `Conexão já existe com ${data.id} - ignorando`);
                    return;
                }
                
                let user = new User(data.id)
                user.pc = createPeer(user)
                users.set(data.id, user)
                createOffer(user, socket)
            }
        })

        socket.on('offer',  function (data) {
            var user = users.get(data.id)
            if (user) {
                // Verificar se já existe uma conexão ativa
                if (user.pc.connectionState === 'connected' || user.pc.connectionState === 'connecting') {
                    log('warn', `Conexão já ativa com ${data.id} - ignorando offer`);
                    return;
                }
                
                // Se já temos um offer local, verificar quem deve ser o offerer baseado no socketId
                if (user.pc.localDescription && user.pc.localDescription.type === 'offer') {
                    // Comparar socketIds para determinar quem deve ser o offerer (menor socketId vence)
                    const mySocketId = socket.id;
                    const theirSocketId = data.id;
                    
                    if (mySocketId < theirSocketId) {
                        log('info', `Meu socketId (${mySocketId}) é menor que ${theirSocketId} - mantendo meu offer`);
                        return; // Manter meu offer
                    } else {
                        log('info', `SocketId ${theirSocketId} é menor que o meu (${mySocketId}) - aceitando offer remoto`);
                        // Aceitar o offer remoto, descartando o local
                        user.pc.setLocalDescription(null).then(() => {
                            answerPeer(user, data.offer, socket);
                        }).catch(error => {
                            log('error', 'Erro ao limpar local description:', error);
                            answerPeer(user, data.offer, socket);
                        });
                    }
                } else {
                    answerPeer(user, data.offer, socket)
                }
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
                // Verificar se a conexão não está em estado stable
                if (user.pc.signalingState !== 'stable') {
                    user.pc.setRemoteDescription(data.answer).then(function() {
                        // Processar candidatos pendentes após definir remote description
                        processPendingCandidates(user);
                    }).catch(function(error) {
                        log('error', 'Erro ao definir remote description:', error);
                        // Se falhar, tentar recriar a conexão
                        if (error.name === 'InvalidStateError') {
                            log('warn', `Recriando conexão para ${data.id} devido a estado inválido`);
                            user.pc.close();
                            user.pc = createPeer(user);
                            // Tentar novamente após um pequeno delay
                            setTimeout(() => {
                                if (user.pc.signalingState !== 'stable') {
                                    user.pc.setRemoteDescription(data.answer).then(() => {
                                        // Processar candidatos pendentes
                                        processPendingCandidates(user);
                                    }).catch(function(retryError) {
                                        log('error', 'Erro na segunda tentativa:', retryError);
                                    });
                                }
                            }, 100);
                        }
                    });
                } else {
                    log('warn', `Conexão já em estado stable para ${data.id} - ignorando answer`);
                }
            }
        })

        socket.on('candidate', function (data) {
            var user = users.get(data.id)
            if (user) {
                // Usar a função helper para processar candidatos
                if (isConnectionReadyForCandidates(user.pc)) {
                    processIceCandidate(user.pc, data.candidate);
                } else {
                    // Armazenar candidatos pendentes
                    if (!user.pendingCandidates) {
                        user.pendingCandidates = [];
                    }
                    user.pendingCandidates.push(data.candidate);
                    log('info', `Candidato pendente armazenado para ${data.id} (${user.pendingCandidates.length} total)`);
                    
                    // Tentar processar candidatos pendentes periodicamente
                    if (!user.pendingCandidatesTimer) {
                        user.pendingCandidatesTimer = setInterval(() => {
                            if (processPendingCandidates(user)) {
                                clearInterval(user.pendingCandidatesTimer);
                                user.pendingCandidatesTimer = null;
                                log('info', `Candidatos pendentes processados para ${data.id}`);
                            }
                        }, 500); // Verificar a cada 500ms
                    }
                }
            } else {
                let user = new User(data.id)
                user.pc = createPeer(user)
                user.pendingCandidates = [data.candidate];
                users.set(data.id, user)
                log('info', `Novo usuário criado para candidato: ${data.id}`);
            }
        })
        
        socket.on('connect', function () {
            console.log('Conectado ao servidor');
            // Entra automaticamente na fila quando conecta
            setTimeout(() => {
                enterQueue();
            }, 1000);
        })

        socket.on('connect_error', function(error) {
            console.log('Connection ERROR!')
            console.log(error)
            // Não chama leave() automaticamente para evitar loops
            showFail()
        })
        
        socket.on('error', function(error) {
            console.log('Socket ERROR!')
            console.log(error)
            showFail()
        })

        socket.on('disconnect', function(reason) {
            console.log('Desconectado do servidor:', reason);
            isInQueue = false;
            if (reason === 'io server disconnect') {
                // Desconexão iniciada pelo servidor
                showFail();
            }
        });

    } catch (error) {
        console.error('Erro ao inicializar Socket.IO:', error);
        showError('Erro ao conectar com o servidor');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    try {
        if (!checkWebRTCSupport()) {
            return;
        }
        
        // Evento de submit no formulário de sala
        const roomForm = document.getElementById('roomForm');
        if (roomForm) {
            roomForm.addEventListener('submit', function(e) {
                e.preventDefault(); // Impede o envio tradicional do formulário
                showLoading(); // Exibe a tela de carregamento enquanto espera a conexão
                // A conexão já está estabelecida, apenas entra na fila
                enterQueue();
            });
        }

        // Evento para enviar mensagens no chat
        const chatForm = document.getElementById('chatForm');
        if (chatForm) {
            chatForm.addEventListener('submit', function(e) {
                e.preventDefault();
                broadcastChatMessage(e);
            });
        }

        // Evento para sair da sala
        const leaveButton = document.getElementById('leave');
        if (leaveButton) {
            leaveButton.addEventListener('click', function(e) {
                e.preventDefault();
                leave();
            });
        }

        // Evento para próximo usuário
        const nextButton = document.getElementById("nextButton");
        if (nextButton) {
            nextButton.addEventListener("click", function(e) {
                e.preventDefault();
                next();
            });
        }

        // Inicializar mídia
        getMediaWithFallback()
        .then(function (stream) {
            myStream = stream;
            setLocalPlayerStream();
            showForm();
            // Inicializar socket após obter permissões de mídia
            initializeSocket();
        }).catch(function (err) {
            log('error', 'Erro ao obter mídia:', err);
            showFail();
        });

    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao inicializar a aplicação');
    }
});

function enterQueue() {
    if (socket && socket.connected && !isInQueue) {
        isInQueue = true;
        const usernameInput = document.getElementById('username');
        const username = usernameInput && usernameInput.value.trim() 
            ? usernameInput.value.trim() 
            : 'Usuário_' + Math.random().toString(36).substr(2, 5);
        
        socket.emit('join-queue', {
            username: username
        });
    } else if (!socket) {
        console.log('Socket não inicializado ainda, aguardando...');
        setTimeout(enterQueue, 1000);
    }
}

function leaveQueue() {
    if (socket && socket.connected && isInQueue) {
        socket.emit('leave-queue');
        isInQueue = false;
    }
}

function updateLoadingMessage(message) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        // Adiciona ou atualiza a mensagem de status
        let statusElement = loadingElement.querySelector('.status-message');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.className = 'status-message text-white text-center mt-4 text-lg';
            loadingElement.appendChild(statusElement);
        }
        statusElement.textContent = message;
    }
}

function updateRoomStatus(data) {
    const roomStatusElement = document.getElementById('room-status');
    if (roomStatusElement && data) {
        const userCount = data.users ? data.users.length + 1 : '?';
        roomStatusElement.innerHTML = `🎯 Sala: ${userCount} usuários`;
        roomStatusElement.title = `Sala: ${data.roomId}`;
    }
}

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function enterInRoom (e) {
    e.preventDefault()
    const room = document.getElementById('inputRoom').value

    if (room) {
        // Para o novo sistema, usamos a fila automática
        // A sala será criada automaticamente quando encontrar um match
        enterQueue();
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
    leaveQueue();
    if (socket && socket.connected) {
        socket.close()
    }
    
    // Limpar todas as conexões WebRTC
    clearAllConnections();
    
    // Limpar timers de candidatos pendentes
    for(var user of users.values()) {
        if (user.pendingCandidatesTimer) {
            clearInterval(user.pendingCandidatesTimer);
            user.pendingCandidatesTimer = null;
        }
        user.selfDestroy()
    }
    users.clear()
    removeAllMessages()
    currentRoomId = null;
    showForm()
}

function next() {
    if (socket && socket.connected) {
        socket.emit('next');
    }
    
    // Limpa os usuários atuais
    for(var user of users.values()) {
        user.selfDestroy()
    }
    users.clear()
    removeAllMessages()
    
    showLoading();
    updateLoadingMessage('Procurando próximo usuário...');
}

function initializeApp() {
    // Código de inicialização existente...
    console.log('Inicializando aplicação...');
}




