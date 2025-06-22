// Configurações globais da aplicação
const CONFIG = {
    // Configurações do servidor
    SERVER_URL: window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin,
    SOCKET_TIMEOUT: 10000,
    RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 1000,
    
    // Configurações WebRTC
    RTC_CONFIG: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
    },
    
    // Configurações de mídia
    MEDIA_CONSTRAINTS: {
        video: {
            height: { ideal: 480, max: 720 },
            width: { ideal: 640, max: 1280 },
            frameRate: { ideal: 30, max: 60 }
        },
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        }
    },
    
    // Configurações de debug
    DEBUG: {
        enabled: true,
        logLevel: 'info', // 'error', 'warn', 'info', 'debug'
        showConnectionStates: true,
        showIceCandidates: false
    }
};

// Função para log com níveis
function log(level, message, ...args) {
    if (!CONFIG.DEBUG.enabled) return;
    
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = levels[CONFIG.DEBUG.logLevel] || 2;
    
    if (levels[level] <= currentLevel) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        
        switch (level) {
            case 'error':
                console.error(prefix, message, ...args);
                break;
            case 'warn':
                console.warn(prefix, message, ...args);
                break;
            case 'info':
                console.info(prefix, message, ...args);
                break;
            case 'debug':
                console.debug(prefix, message, ...args);
                break;
        }
    }
}

// Tratamento global de erros de Promise
window.addEventListener('unhandledrejection', function(event) {
    log('error', 'Promise rejeitada não tratada:', event.reason);
    
    // Se for um erro de WebRTC, tentar recuperar
    if (event.reason && event.reason.name === 'InvalidStateError') {
        log('warn', 'Erro de estado WebRTC detectado, tentando recuperar...');
        // Aqui podemos adicionar lógica de recuperação se necessário
    }
    
    // Prevenir que o erro apareça no console
    event.preventDefault();
});

// Tratamento global de erros
window.addEventListener('error', function(event) {
    log('error', 'Erro global:', event.error);
    
    // Se for um erro de WebRTC, tentar recuperar
    if (event.error && event.error.name === 'InvalidStateError') {
        log('warn', 'Erro de estado WebRTC detectado, tentando recuperar...');
        // Aqui podemos adicionar lógica de recuperação se necessário
    }
});

// Função para verificar suporte WebRTC
function checkWebRTCSupport() {
    const required = [
        'RTCPeerConnection',
        'getUserMedia',
        'MediaStream'
    ];
    
    for (const api of required) {
        if (!window[api]) {
            log('error', `WebRTC API não suportada: ${api}`);
            return false;
        }
    }
    
    log('info', 'WebRTC suportado');
    return true;
}

// Função para criar configuração RTC segura
function createSafeRTCConfig() {
    try {
        return new RTCPeerConnection(CONFIG.RTC_CONFIG);
    } catch (error) {
        log('error', 'Erro ao criar RTCPeerConnection:', error);
        // Fallback para configuração básica
        return new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
    }
}

// Função para obter mídia com fallback
async function getMediaWithFallback() {
    try {
        return await navigator.mediaDevices.getUserMedia(CONFIG.MEDIA_CONSTRAINTS);
    } catch (error) {
        log('warn', 'Erro ao obter mídia com configuração ideal:', error);
        
        // Fallback para configuração básica
        try {
            return await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
        } catch (fallbackError) {
            log('error', 'Erro ao obter mídia com fallback:', fallbackError);
            throw fallbackError;
        }
    }
}

// Exportar configurações
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, log, checkWebRTCSupport, createSafeRTCConfig, getMediaWithFallback };
} 