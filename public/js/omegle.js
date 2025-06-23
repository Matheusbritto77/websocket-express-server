class OmegleChat {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.isWaiting = false;
        this.currentPartner = null;
        
        // Detectar Safari
        this.isSafari = this.detectSafari();
        
        this.initializeElements();
        this.bindEvents();
    }

    // Detectar Safari
    detectSafari() {
        const userAgent = navigator.userAgent;
        return /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    }

    initializeElements() {
        // Elementos principais
        this.statusBar = document.getElementById('statusBar');
        this.statusText = document.getElementById('statusText');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.loadingText = document.getElementById('loadingText');
        this.loadingSubtext = document.getElementById('loadingSubtext');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.messageInput = document.getElementById('messageInput');
        this.messageForm = document.getElementById('messageForm');
        
        // Botões
        this.startBtn = document.getElementById('startBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.stopBtn = document.getElementById('stopBtn');
    }

    bindEvents() {
        // Botões
        this.startBtn.addEventListener('click', () => this.startChat());
        this.nextBtn.addEventListener('click', () => this.nextUser());
        this.stopBtn.addEventListener('click', () => this.stopChat());
        
        // Formulário de mensagem
        this.messageForm.addEventListener('submit', (e) => this.sendMessage(e));
        
        // Enter para enviar mensagem
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(e);
            }
        });

        // Adicionar listener para keydown como fallback para Safari
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(e);
            }
        });
    }

    initializeSocket() {
        // Configurações específicas para Safari
        const socketOptions = {
            timeout: 20000,
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        };

        // Safari tem melhor compatibilidade com polling primeiro
        if (this.isSafari) {
            socketOptions.transports = ['polling', 'websocket'];
        } else {
            socketOptions.transports = ['websocket', 'polling'];
        }

        this.socket = io(socketOptions);

        // Eventos do socket
        this.socket.on('connect', () => {
            console.log('Conectado ao servidor');
            this.updateStatus('Conectado ao servidor', 'success');
            
            // Se estiver esperando, envia o join_chat automaticamente
            if (this.isWaiting) {
                this.socket.emit('join_chat', { type: 'text' });
                console.log('Evento join_chat enviado automaticamente após conexão');
            }
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

        this.socket.on('partner_left', (data) => {
            this.handlePartnerLeft(data);
        });

        this.socket.on('error', (data) => {
            this.showError(data.message);
        });
    }

    startChat() {
        if (!this.socket) {
            this.initializeSocket();
        }

        this.isWaiting = true;
        this.updateStatus('Procurando alguém para conversar...', 'waiting');
        this.showLoading();
        this.updateButtons('waiting');
        
        // Garante que o evento join_chat seja enviado
        if (this.socket && this.socket.connected) {
            this.socket.emit('join_chat', { type: 'text' });
            console.log('Evento join_chat enviado para chat de texto');
        } else {
            console.log('Socket não conectado, aguardando conexão...');
            // Se o socket não estiver conectado, o evento será enviado quando conectar
        }
    }

    handleStatusUpdate(data) {
        console.log('Status atualizado:', data);
        
        try {
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
                    this.currentPartner = data.roomId;
                    this.updateStatus(data.message, 'connected');
                    this.hideLoading();
                    this.enableChat();
                    this.updateButtons('connected');
                    this.addSystemMessage('Você foi conectado com um estranho!');
                    break;
                    
                case 'partner_disconnected':
                    this.isConnected = false;
                    this.currentPartner = null;
                    this.updateStatus(data.message, 'waiting');
                    this.showLoading();
                    this.updateButtons('waiting');
                    this.disableChat();
                    this.addSystemMessage('Seu parceiro desconectou. Procurando novo usuário...');
                    break;
                    
                default:
                    console.log('Status desconhecido:', data.type);
                    break;
            }
        } catch (error) {
            console.error('Erro ao processar status:', error);
            this.showError('Erro ao processar status. Tente novamente.');
        }
    }

    handleIncomingMessage(data) {
        console.log('Mensagem recebida:', data);
        
        try {
            if (data && data.text) {
                this.addMessage(data.text, 'received', data.timestamp);
            } else {
                console.warn('Mensagem recebida sem texto:', data);
            }
        } catch (error) {
            console.error('Erro ao processar mensagem recebida:', error);
        }
    }

    handlePartnerLeft(data) {
        console.log('Parceiro saiu:', data);
        
        try {
            this.isConnected = false;
            this.currentPartner = null;
            this.updateStatus('Seu parceiro saiu. Procurando novo usuário...', 'waiting');
            this.showLoading();
            this.updateButtons('waiting');
            this.disableChat();
            this.addSystemMessage('Seu parceiro saiu da conversa. Procurando novo usuário...');
        } catch (error) {
            console.error('Erro ao processar saída do parceiro:', error);
        }
    }

    sendMessage(e) {
        e.preventDefault();
        
        const text = this.messageInput.value.trim();
        if (!text || !this.isConnected) return;
        
        // Verifica se está conectado
        if (!this.isConnected || !this.socket || !this.socket.connected) {
            this.showError('Você não está conectado com ninguém');
            return;
        }
        
        // Envia a mensagem
        try {
            this.socket.emit('message', { text });
            
            // Adiciona à interface
            this.addMessage(text, 'sent', new Date().toISOString());
            
            // Limpa o input
            this.messageInput.value = '';
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            this.showError('Erro ao enviar mensagem. Tente novamente.');
        }
    }

    nextUser() {
        if (this.socket && this.socket.connected) {
            try {
                // Reseta estados
                this.isConnected = false;
                this.currentPartner = null;
                
                // Envia solicitação de próximo
                this.socket.emit('next');
                
                // Atualiza interface
                this.updateStatus('Procurando próximo usuário...', 'waiting');
                this.showLoading();
                this.updateButtons('waiting');
                this.disableChat();
                this.clearMessages();
                this.addSystemMessage('Procurando próximo usuário...');
                
                console.log('Solicitação de próximo enviada');
            } catch (error) {
                console.error('Erro ao solicitar próximo usuário:', error);
                this.showError('Erro ao trocar de usuário. Tente novamente.');
            }
        } else {
            this.showError('Você não está conectado ao servidor');
        }
    }

    stopChat() {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.resetChat();
        this.updateStatus('Chat parado. Clique em "Iniciar Chat" para começar.', 'stopped');
        this.updateButtons('stopped');
    }

    resetChat() {
        this.isConnected = false;
        this.isWaiting = false;
        this.currentPartner = null;
        this.clearMessages();
        this.disableChat();
        this.hideLoading();
    }

    // Métodos de UI
    updateStatus(message, type = 'info') {
        this.statusText.textContent = message;
        this.statusBar.className = `status-bar ${type}`;
    }

    showLoading() {
        this.loadingScreen.classList.remove('hidden');
        this.chatMessages.classList.add('hidden');
    }

    hideLoading() {
        this.loadingScreen.classList.add('hidden');
        this.chatMessages.classList.remove('hidden');
    }

    enableChat() {
        this.messageInput.disabled = false;
        this.messageInput.placeholder = 'Digite sua mensagem...';
        this.messageForm.querySelector('button').disabled = false;
    }

    disableChat() {
        this.messageInput.disabled = true;
        this.messageInput.placeholder = 'Aguarde uma conexão...';
        this.messageForm.querySelector('button').disabled = true;
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
        try {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}`;
            
            const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
            
            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="message-text">${this.escapeHtml(text)}</div>
                    <div class="message-time">${time}</div>
                </div>
            `;
            
            this.chatMessages.appendChild(messageDiv);
            this.scrollToBottom();
        } catch (error) {
            console.error('Erro ao adicionar mensagem:', error);
        }
    }

    addSystemMessage(text) {
        try {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message system';
            
            const time = new Date().toLocaleTimeString();
            
            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="message-text">${this.escapeHtml(text)}</div>
                    <div class="message-time">${time}</div>
                </div>
            `;
            
            this.chatMessages.appendChild(messageDiv);
            this.scrollToBottom();
        } catch (error) {
            console.error('Erro ao adicionar mensagem do sistema:', error);
        }
    }

    clearMessages() {
        this.chatMessages.innerHTML = '';
    }

    scrollToBottom() {
        try {
            if (this.chatMessages) {
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            }
        } catch (error) {
            console.error('Erro ao fazer scroll:', error);
        }
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
}

// Inicializa o chat quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    window.omegleChat = new OmegleChat();
}); 