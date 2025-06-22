class OmegleChat {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.isWaiting = false;
        this.currentPartner = null;
        
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
            
            // Entra no chat de texto
            this.socket.emit('join_chat', { type: 'text' });
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
        
        // Simula o envio do evento para entrar na fila
        // O servidor automaticamente adiciona à fila quando conecta
        console.log('Iniciando chat...');
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
        }
    }

    handleIncomingMessage(data) {
        console.log('Mensagem recebida:', data);
        this.addMessage(data.text, 'received', data.timestamp);
    }

    sendMessage(e) {
        e.preventDefault();
        
        const text = this.messageInput.value.trim();
        if (!text || !this.isConnected) return;
        
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
            this.disableChat();
            this.clearMessages();
            this.addSystemMessage('Procurando próximo usuário...');
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
}

// Inicializa o chat quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    window.omegleChat = new OmegleChat();
}); 