const { RTCPeerConnection } = window;

function createPeer(user) {
    const rtcConfiguration = {
        iceServers: [
            {
                urls: 'stun:stun.l.google.com:19302'
            }
        ]
    };

    var pc = new RTCPeerConnection(rtcConfiguration);

    pc.onicecandidate = function(event) {
        if (!event.candidate) {
            return;
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

    return pc;
}

function createOffer(user, socket) {
    user.dc = user.pc.createDataChannel('chat');
    setupDataChannel(user.dc);

    user.pc.createOffer().then(function(offer) {
        const h264Offer = enforceH264Codec(offer.sdp);
        user.pc.setLocalDescription({ type: 'offer', sdp: h264Offer }).then(function() {
            socket.emit('offer', {
                id: user.id,
                offer: user.pc.localDescription
            });
        });
    }).catch(console.error);
}

function answerPeer(user, offer, socket) {
    const h264Offer = enforceH264Codec(offer.sdp);

    user.pc.setRemoteDescription({ type: 'offer', sdp: h264Offer }).then(function() {
        user.pc.createAnswer().then(function(answer) {
            const h264Answer = enforceH264Codec(answer.sdp);
            user.pc.setLocalDescription({ type: 'answer', sdp: h264Answer }).then(function() {
                socket.emit('answer', {
                    id: user.id,
                    answer: user.pc.localDescription
                });
            });
        });
    }).catch(console.error);
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
    dataChannel.onopen = checkDataChannelState;
    dataChannel.onclose = checkDataChannelState;
    dataChannel.onmessage = function(e) {
        addMessage(e.data);
    };
}

function checkDataChannelState(event) {
    console.log('WebRTC channel state is:', event.type);
}
