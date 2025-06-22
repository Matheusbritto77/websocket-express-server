 const { RTCPeerConnection } = window;

function createPeer(user) {
    const pc = createStablePeerConnection(user.id);

    pc.onicecandidate = function(event) {
        if (!event.candidate) {
            return;
        }

        if (CONFIG.DEBUG.showIceCandidates) {
            log('debug', `ICE candidate para ${user.id}:`, event.candidate);
        }

        socket.emit('candidate', {
            id: user.id,
            candidate: event.candidate
        });
    };

    for (const track of myStream.getTracks()) {
        pc.addTrack(track, myStream);
    }

    pc.ontrack = function(event) {
        if (user.player) {
            return;
        }
        user.player = addVideoPlayer(event.streams[0]);
    };

    pc.ondatachannel = function(event) {
        user.dc = event.channel;
        setupDataChannel(user.dc);
    };

    // Adicionar logs para debug
    if (CONFIG.DEBUG.showConnectionStates) {
        pc.onconnectionstatechange = function() {
            log('info', `Connection state for user ${user.id}:`, pc.connectionState);
        };

        pc.oniceconnectionstatechange = function() {
            log('info', `ICE connection state for user ${user.id}:`, pc.iceConnectionState);
        };

        pc.onsignalingstatechange = function() {
            log('info', `Signaling state for user ${user.id}:`, pc.signalingState);
        };
    }

    return pc;
}

function createOffer(user, socket) {
    // Verificar se já existe uma conexão ativa
    if (user.pc && user.pc.connectionState === 'connected') {
        log('warn', `Conexão já estabelecida com ${user.id}`);
        return;
    }

    try {
        user.dc = user.pc.createDataChannel('chat');
        setupDataChannel(user.dc);

        user.pc.createOffer().then(function(offer) {
            const h264Offer = enforceH264Codec(offer.sdp);
            return user.pc.setLocalDescription({ type: 'offer', sdp: h264Offer });
        }).then(function() {
            socket.emit('offer', {
                id: user.id,
                offer: user.pc.localDescription
            });
            log('info', `Offer criado para ${user.id}`);
        }).catch(function(error) {
            log('error', 'Erro ao criar offer:', error);
        });
    } catch (error) {
        log('error', 'Erro ao criar data channel:', error);
    }
}

function answerPeer(user, offer, socket) {
    // Verificar se já existe uma conexão ativa
    if (user.pc && user.pc.connectionState === 'connected') {
        log('warn', `Conexão já estabelecida com ${user.id}`);
        return;
    }

    const h264Offer = enforceH264Codec(offer.sdp);

    user.pc.setRemoteDescription({ type: 'offer', sdp: h264Offer }).then(function() {
        return user.pc.createAnswer();
    }).then(function(answer) {
        const h264Answer = enforceH264Codec(answer.sdp);
        return user.pc.setLocalDescription({ type: 'answer', sdp: h264Answer });
    }).then(function() {
        socket.emit('answer', {
            id: user.id,
            answer: user.pc.localDescription
        });
        log('info', `Answer criado para ${user.id}`);
    }).catch(function(error) {
        log('error', 'Erro ao criar answer:', error);
    });
}

function enforceH264Codec(sdp) {
    const lines = sdp.split('\r\n');
    const mLineIndex = lines.findIndex(line => line.startsWith('m=video'));

    if (mLineIndex === -1) {
        return sdp; // No video line found, return original SDP
    }

    const h264PayloadType = lines.find(line => line.includes('H264'))?.match(/:(\d+)/)?.[1];

    if (!h264PayloadType) {
        return sdp; // No H264 codec found, return original SDP
    }

    const mLine = lines[mLineIndex].split(' ');
    const newMLine = [mLine[0], mLine[1], mLine[2], h264PayloadType, ...mLine.slice(3).filter(pt => pt !== h264PayloadType)];
    lines[mLineIndex] = newMLine.join(' ');

    return lines.join('\r\n');
}

function setupDataChannel(dataChannel) {
    dataChannel.onopen = function() {
        log('info', 'Data channel opened');
        checkDataChannelState({ type: 'open' });
    };
    dataChannel.onclose = function() {
        log('info', 'Data channel closed');
        checkDataChannelState({ type: 'close' });
    };
    dataChannel.onmessage = function(e) {
        addMessage(e.data);
    };
    dataChannel.onerror = function(error) {
        log('error', 'Data channel error:', error);
    };
}

function checkDataChannelState(event) {
    log('info', 'WebRTC channel state is:', event.type);
} 