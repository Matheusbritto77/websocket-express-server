class VideoChat {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.isWaiting = false;
        this.currentPartner = null;
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.pendingCandidates = []; // Array para candidatos pendentes
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // Elementos principais
        this.statusBar = document.getElementById('statusBar');
        this.statusText = document.getElementById('statusText');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.loadingText = document.getElementById('loadingText');
        this.loadingSubtext = document.getElementById('loadingSubtext');
        this.permissionRequest = document.getElementById('permissionRequest');
        this.videoArea = document.getElementById('videoArea');
        this.chatArea = document.getElementById('chatArea');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.messageForm = document.getElementById('messageForm');
        
        // Vídeos
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.localPlaceholder = document.getElementById('localPlaceholder');
        this.remotePlaceholder = document.getElementById('remotePlaceholder');
        
        // Botões
        this.requestPermissionBtn = document.getElementById('requestPermissionBtn');
        this.startBtn = document.getElementById('startBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.stopBtn = document.getElementById('stopBtn');
    }

    bindEvents() {
        // Botões
        this.requestPermissionBtn.addEventListener('click', () => this.requestPermissions());
        this.startBtn.addEventListener('click', () => this.startVideoChat());
        this.nextBtn.addEventListener('click', () => this.nextUser());
        this.stopBtn.addEventListener('click', () => this.stopVideoChat());
        
        // Formulário de mensagem
        this.messageForm.addEventListener('submit', (e) => this.sendMessage(e));
        
        // Enter para enviar mensagem
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(e);
            }
        });
    }

    async requestPermissions() {
        try {
            this.updateStatus('Solicitando permissões...', 'waiting');
            
            // Solicita permissões de câmera e microfone
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            
            // Verifica se o stream tem tracks
            if (this.localStream && this.localStream.getTracks().length > 0) {
                console.log('Stream local obtido, tracks:', this.localStream.getTracks().length);
                
                // Mostra o vídeo local
                this.localVideo.srcObject = this.localStream;
                this.localPlaceholder.style.display = 'none';
                
                // Adiciona listeners para o vídeo local
                this.localVideo.onloadedmetadata = () => {
                    console.log('Vídeo local carregado, dimensões:', this.localVideo.videoWidth, 'x', this.localVideo.videoHeight);
                };
                
                this.localVideo.onplay = () => {
                    console.log('Vídeo local começou a tocar');
                };
                
                this.localVideo.onerror = (error) => {
                    console.error('Erro no vídeo local:', error);
                };
            } else {
                throw new Error('Stream local não tem tracks');
            }
            
            // Esconde a solicitação de permissão
            this.permissionRequest.classList.add('hidden');
            
            this.updateStatus('Permissões concedidas! Clique em "Iniciar Vídeo"', 'success');
            this.startBtn.disabled = false;
            
        } catch (error) {
            console.error('Erro ao solicitar permissões:', error);
            this.updateStatus('Erro ao acessar câmera/microfone. Verifique as permissões.', 'error');
            this.showError('Não foi possível acessar sua câmera ou microfone. Verifique as permissões do navegador.');
        }
    }

    initializeSocket() {
        this.socket = io({
            timeout: 20000,
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling']
        });

        // Eventos do socket
        this.socket.on('connect', () => {
            console.log('Conectado ao servidor');
            this.updateStatus('Conectado ao servidor', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('Desconectado do servidor');
            this.updateStatus('Desconectado do servidor', 'error');
            this.resetChat();
        });

        this.socket.on('status', (data) => {
            this.handleStatusUpdate(data);
        });

        this.socket.on('message', (data) => {
            this.handleIncomingMessage(data);
        });

        // Eventos WebRTC
        this.socket.on('offer', (data) => {
            this.handleOffer(data);
        });

        this.socket.on('answer', (data) => {
            this.handleAnswer(data);
        });

        this.socket.on('candidate', (data) => {
            this.handleCandidate(data);
        });

        this.socket.on('error', (data) => {
            this.showError(data.message);
        });
    }

    startVideoChat() {
        if (!this.localStream) {
            this.showError('Você precisa permitir o acesso à câmera primeiro.');
            return;
        }

        if (!this.socket) {
            this.initializeSocket();
        }

        this.isWaiting = true;
        this.updateStatus('Procurando alguém para conversar...', 'waiting');
        this.showLoading();
        this.updateButtons('waiting');
        
        console.log('Iniciando chat de vídeo...');
    }

    handleStatusUpdate(data) {
        console.log('Status atualizado:', data);
        
        switch (data.type) {
            case 'waiting':
                this.isWaiting = true;
                this.isConnected = false;
                this.updateStatus(data.message, 'waiting');
                this.showLoading();
                this.updateButtons('waiting');
                break;
                
            case 'connected':
                this.isWaiting = false;
                this.isConnected = true;
                this.currentPartner = data.partnerId;
                this.updateStatus(data.message, 'connected');
                this.hideLoading();
                this.showVideoArea();
                this.updateButtons('connected');
                this.addSystemMessage('Você foi conectado com um estranho!');
                this.initializePeerConnection();
                break;
                
            case 'partner_disconnected':
                this.isConnected = false;
                this.currentPartner = null;
                this.updateStatus(data.message, 'waiting');
                this.showLoading();
                this.updateButtons('waiting');
                this.hideVideoArea();
                this.cleanupPeerConnection();
                this.addSystemMessage('Seu parceiro desconectou. Procurando novo usuário...');
                break;
        }
    }

    handleIncomingMessage(data) {
        console.log('Mensagem recebida:', data);
        this.addMessage(data.text, 'received', data.timestamp);
    }

    sendMessage(e) {
        e.preventDefault();
        
        const text = this.messageInput.value.trim();
        if (!text) return;
        
        // Envia a mensagem
        this.socket.emit('message', { text });
        
        // Adiciona à interface
        this.addMessage(text, 'sent', new Date().toISOString());
        
        // Limpa o input
        this.messageInput.value = '';
    }

    nextUser() {
        if (this.socket) {
            this.socket.emit('next');
            this.isConnected = false;
            this.currentPartner = null;
            this.updateStatus('Procurando próximo usuário...', 'waiting');
            this.showLoading();
            this.updateButtons('waiting');
            this.hideVideoArea();
            this.cleanupPeerConnection();
            this.clearMessages();
            this.addSystemMessage('Procurando próximo usuário...');
        }
    }

    stopVideoChat() {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.resetChat();
        this.updateStatus('Chat parado. Clique em "Iniciar Vídeo" para começar.', 'stopped');
        this.updateButtons('stopped');
    }

    resetChat() {
        this.isConnected = false;
        this.isWaiting = false;
        this.currentPartner = null;
        this.clearMessages();
        this.hideVideoArea();
        this.hideLoading();
        this.cleanupPeerConnection();
    }

    // WebRTC Methods
    initializePeerConnection() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        // Adiciona stream local
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });

        // Manipula stream remoto
        this.peerConnection.ontrack = (event) => {
            console.log('Stream remoto recebido:', event.streams);
            this.remoteStream = event.streams[0];
            
            // Verifica se o stream tem tracks
            if (this.remoteStream && this.remoteStream.getTracks().length > 0) {
                console.log('Stream tem tracks:', this.remoteStream.getTracks().length);
                this.remoteVideo.srcObject = this.remoteStream;
                this.remotePlaceholder.style.display = 'none';
                
                // Adiciona listener para quando o vídeo começar a tocar
                this.remoteVideo.onloadedmetadata = () => {
                    console.log('Vídeo remoto carregado, dimensões:', this.remoteVideo.videoWidth, 'x', this.remoteVideo.videoHeight);
                };
                
                this.remoteVideo.onplay = () => {
                    console.log('Vídeo remoto começou a tocar');
                };
                
                this.remoteVideo.onerror = (error) => {
                    console.error('Erro no vídeo remoto:', error);
                };
            } else {
                console.warn('Stream remoto não tem tracks');
            }
        };

        // Manipula candidatos ICE
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Enviando candidate:', event.candidate);
                this.socket.emit('candidate', {
                    candidate: event.candidate
                });
            }
        };

        // Logs de estado da conexão
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE Connection State:', this.peerConnection.iceConnectionState);
        };

        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection State:', this.peerConnection.connectionState);
        };

        this.peerConnection.onsignalingstatechange = () => {
            console.log('Signaling State:', this.peerConnection.signalingState);
        };

        // Determina quem deve ser o offerer baseado no socket ID
        const mySocketId = this.socket.id;
        const partnerSocketId = this.currentPartner;
        
        console.log('Meu socket ID:', mySocketId);
        console.log('Partner socket ID:', partnerSocketId);
        
        // O usuário com socket ID menor será o offerer
        if (mySocketId < partnerSocketId) {
            console.log('Sou o offerer, criando offer...');
            setTimeout(() => this.createOffer(), 1000); // Delay para estabilizar
        } else {
            console.log('Sou o answerer, aguardando offer...');
        }
    }

    async createOffer() {
        try {
            console.log('Criando offer...');
            const offer = await this.peerConnection.createOffer();
            console.log('Offer criado:', offer);
            
            await this.peerConnection.setLocalDescription(offer);
            console.log('Local description definida');
            
            this.socket.emit('offer', {
                offer: offer
            });
            console.log('Offer enviado');
        } catch (error) {
            console.error('Erro ao criar offer:', error);
        }
    }

    async handleOffer(data) {
        try {
            console.log('Offer recebido, processando...');
            
            if (!this.peerConnection) {
                console.log('Criando peer connection para answerer...');
                this.initializePeerConnection();
                return; // Retorna para evitar processamento duplo
            }
            
            // Se já temos uma descrição local, não processamos o offer
            if (this.peerConnection.localDescription) {
                console.log('Já temos descrição local, ignorando offer');
                return;
            }
            
            console.log('Definindo remote description...');
            await this.peerConnection.setRemoteDescription(data.offer);
            console.log('Remote description definida');
            
            console.log('Criando answer...');
            const answer = await this.peerConnection.createAnswer();
            console.log('Answer criado:', answer);
            
            await this.peerConnection.setLocalDescription(answer);
            console.log('Local description definida via answer');
            
            this.socket.emit('answer', {
                answer: answer
            });
            console.log('Answer enviado');
            
            // Processa candidatos pendentes
            await this.processPendingCandidates();
        } catch (error) {
            console.error('Erro ao processar offer:', error);
        }
    }

    async handleAnswer(data) {
        try {
            console.log('Answer recebido, processando...');
            
            // Só processa se não temos descrição remota ainda
            if (!this.peerConnection.remoteDescription) {
                console.log('Definindo remote description via answer...');
                await this.peerConnection.setRemoteDescription(data.answer);
                console.log('Remote description definida via answer');
                
                // Processa candidatos pendentes
                await this.processPendingCandidates();
            } else {
                console.log('Já temos descrição remota, ignorando answer');
            }
        } catch (error) {
            console.error('Erro ao processar answer:', error);
        }
    }

    async handleCandidate(data) {
        try {
            console.log('Candidate recebido, processando...');
            
            // Se temos descrição remota, adiciona imediatamente
            if (this.peerConnection.remoteDescription) {
                await this.peerConnection.addIceCandidate(data.candidate);
                console.log('Candidate adicionado imediatamente');
            } else {
                // Caso contrário, armazena para adicionar depois
                this.pendingCandidates.push(data.candidate);
                console.log('Candidate armazenado para adicionar depois. Total pendente:', this.pendingCandidates.length);
            }
        } catch (error) {
            console.error('Erro ao processar candidate:', error);
        }
    }

    async processPendingCandidates() {
        if (this.pendingCandidates.length > 0 && this.peerConnection.remoteDescription) {
            console.log(`Processando ${this.pendingCandidates.length} candidatos pendentes...`);
            
            for (const candidate of this.pendingCandidates) {
                try {
                    await this.peerConnection.addIceCandidate(candidate);
                    console.log('Candidate pendente adicionado');
                } catch (error) {
                    console.error('Erro ao adicionar candidate pendente:', error);
                }
            }
            
            this.pendingCandidates = [];
            console.log('Todos os candidatos pendentes processados');
        }
    }

    cleanupPeerConnection() {
        console.log('Limpando peer connection...');
        
        if (this.peerConnection) {
            // Fecha todas as conexões
            this.peerConnection.close();
            this.peerConnection = null;
            console.log('Peer connection fechada');
        }
        
        // Limpa o vídeo remoto
        if (this.remoteVideo.srcObject) {
            this.remoteVideo.srcObject = null;
            console.log('Vídeo remoto limpo');
        }
        
        // Mostra placeholder do vídeo remoto
        this.remotePlaceholder.style.display = 'block';
        
        // Limpa candidatos pendentes
        this.pendingCandidates = [];
        console.log('Candidatos pendentes limpos');
        
        // Reseta o currentPartner
        this.currentPartner = null;
        console.log('Partner resetado');
    }

    // UI Methods
    updateStatus(message, type = 'info') {
        this.statusText.textContent = message;
        this.statusBar.className = `status-bar ${type}`;
    }

    showLoading() {
        this.loadingScreen.classList.remove('hidden');
        this.videoArea.classList.add('hidden');
        this.chatArea.classList.add('hidden');
    }

    hideLoading() {
        this.loadingScreen.classList.add('hidden');
    }

    showVideoArea() {
        this.videoArea.classList.remove('hidden');
        this.chatArea.classList.remove('hidden');
    }

    hideVideoArea() {
        this.videoArea.classList.add('hidden');
        this.chatArea.classList.add('hidden');
    }

    updateButtons(state) {
        switch (state) {
            case 'waiting':
                this.startBtn.disabled = true;
                this.nextBtn.disabled = true;
                this.stopBtn.disabled = false;
                break;
            case 'connected':
                this.startBtn.disabled = true;
                this.nextBtn.disabled = false;
                this.stopBtn.disabled = false;
                break;
            case 'stopped':
                this.startBtn.disabled = false;
                this.nextBtn.disabled = true;
                this.stopBtn.disabled = true;
                break;
        }
    }

    addMessage(text, type, timestamp) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const time = new Date(timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageDiv.innerHTML = `
            <div>${this.escapeHtml(text)}</div>
            <div class="message-time">${time}</div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        messageDiv.style.cssText = `
            background: #fff3cd;
            color: #856404;
            text-align: center;
            font-style: italic;
            margin: 10px auto;
            max-width: 80%;
        `;
        messageDiv.textContent = text;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    clearMessages() {
        this.chatMessages.innerHTML = '';
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        
        // Remove erros anteriores
        const existingErrors = document.querySelectorAll('.error');
        existingErrors.forEach(err => err.remove());
        
        // Adiciona o novo erro
        this.chatMessages.appendChild(errorDiv);
        this.scrollToBottom();
        
        // Remove após 5 segundos
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Método para verificar status da conexão
    checkConnectionStatus() {
        if (this.peerConnection) {
            console.log('=== STATUS DA CONEXÃO ===');
            console.log('ICE Connection State:', this.peerConnection.iceConnectionState);
            console.log('Connection State:', this.peerConnection.connectionState);
            console.log('Signaling State:', this.peerConnection.signalingState);
            console.log('Local Description:', this.peerConnection.localDescription ? 'Definida' : 'Não definida');
            console.log('Remote Description:', this.peerConnection.remoteDescription ? 'Definida' : 'Não definida');
            console.log('Candidatos pendentes:', this.pendingCandidates.length);
            console.log('Stream local:', this.localStream ? 'Ativo' : 'Não ativo');
            console.log('Stream remoto:', this.remoteStream ? 'Ativo' : 'Não ativo');
            console.log('========================');
        } else {
            console.log('Peer connection não existe');
        }
    }

    // Método para forçar reconexão
    async forceReconnect() {
        console.log('Forçando reconexão...');
        this.cleanupPeerConnection();
        
        // Aguarda um pouco antes de recriar
        setTimeout(() => {
            if (this.isConnected && this.currentPartner) {
                this.initializePeerConnection();
            }
        }, 2000);
    }
}

// Inicializa o chat de vídeo quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    window.videoChat = new VideoChat();
}); 