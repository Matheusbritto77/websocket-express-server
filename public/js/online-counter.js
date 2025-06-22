class OnlineCounter {
    constructor() {
        this.socket = null;
        this.counterElement = null;
        this.statsElement = null;
        this.initializeElements();
        this.initializeSocket();
    }

    initializeElements() {
        // Cria o widget de contador
        this.createWidget();
    }

    createWidget() {
        // Cria o container do widget
        const widget = document.createElement('div');
        widget.id = 'online-widget';
        widget.className = 'online-widget';
        widget.innerHTML = `
            <div class="online-counter">
                <div class="counter-icon">👥</div>
                <div class="counter-content">
                    <div class="counter-main">
                        <span id="online-count">0</span> online
                    </div>
                    <div class="counter-details" id="online-details">
                        <span class="detail-item">📝 <span id="text-waiting">0</span> aguardando</span>
                        <span class="detail-item">📹 <span id="video-waiting">0</span> aguardando</span>
                    </div>
                </div>
            </div>
        `;

        // Adiciona o widget ao body
        document.body.appendChild(widget);

        // Referências aos elementos
        this.counterElement = document.getElementById('online-count');
        this.statsElement = document.getElementById('online-details');
    }

    initializeSocket() {
        // Conecta ao servidor apenas para receber estatísticas
        this.socket = io({
            timeout: 20000,
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling'],
            query: { type: 'stats_only' } // Identifica que é apenas para estatísticas
        });

        // Eventos do socket
        this.socket.on('connect', () => {
            console.log('Online counter conectado ao servidor');
            this.requestInitialStats();
        });

        this.socket.on('disconnect', () => {
            console.log('Online counter desconectado do servidor');
        });

        this.socket.on('online_stats', (data) => {
            this.updateStats(data);
        });
    }

    async requestInitialStats() {
        try {
            const response = await fetch('/api/online');
            const stats = await response.json();
            this.updateStats(stats);
        } catch (error) {
            console.error('Erro ao obter estatísticas iniciais:', error);
        }
    }

    updateStats(data) {
        if (this.counterElement) {
            this.counterElement.textContent = data.totalOnline;
        }

        const textWaiting = document.getElementById('text-waiting');
        const videoWaiting = document.getElementById('video-waiting');

        if (textWaiting) {
            textWaiting.textContent = data.textChatWaiting;
        }

        if (videoWaiting) {
            videoWaiting.textContent = data.videoChatWaiting;
        }

        // Adiciona animação de atualização
        this.animateUpdate();
    }

    animateUpdate() {
        const widget = document.getElementById('online-widget');
        if (widget) {
            widget.classList.add('updating');
            setTimeout(() => {
                widget.classList.remove('updating');
            }, 500);
        }
    }
}

// Inicializa o contador quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    window.onlineCounter = new OnlineCounter();
}); 