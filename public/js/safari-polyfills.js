// Polyfills e correções específicas para Safari
(function() {
    'use strict';

    // Detectar Safari
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    if (!isSafari) {
        return; // Só aplica polyfills no Safari
    }

    console.log('🔧 Aplicando polyfills específicos para Safari');

    // Polyfill para Promise se não existir
    if (typeof Promise === 'undefined') {
        console.warn('Promise não suportado, carregando polyfill...');
        // Aqui você pode carregar um polyfill de Promise
    }

    // Correção para getUserMedia em Safari
    if (navigator.mediaDevices && !navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia = function(constraints) {
            const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
            
            if (!getUserMedia) {
                return Promise.reject(new Error('getUserMedia não é suportado'));
            }

            return new Promise(function(resolve, reject) {
                getUserMedia.call(navigator, constraints, resolve, reject);
            });
        };
    }

    // Correção para WebRTC em Safari
    if (typeof RTCPeerConnection !== 'undefined') {
        const originalRTCPeerConnection = RTCPeerConnection;
        
        // Sobrescrever construtor para adicionar configurações específicas do Safari
        window.RTCPeerConnection = function(configuration) {
            // Configurações padrão para Safari
            const safariConfig = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ],
                iceCandidatePoolSize: 10,
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            };

            // Mesclar configurações
            const finalConfig = Object.assign({}, safariConfig, configuration);
            
            console.log('🔧 RTCPeerConnection configurado para Safari:', finalConfig);
            
            return new originalRTCPeerConnection(finalConfig);
        };

        // Copiar propriedades estáticas
        Object.setPrototypeOf(window.RTCPeerConnection, originalRTCPeerConnection);
        Object.setPrototypeOf(window.RTCPeerConnection.prototype, originalRTCPeerConnection.prototype);
    }

    // Correção para Socket.IO em Safari
    if (typeof io !== 'undefined') {
        const originalIO = io;
        
        // Sobrescrever io para adicionar configurações específicas do Safari
        window.io = function(url, options) {
            const safariOptions = {
                transports: ['polling', 'websocket'],
                timeout: 20000,
                forceNew: true,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            };

            const finalOptions = Object.assign({}, safariOptions, options);
            
            console.log('🔧 Socket.IO configurado para Safari:', finalOptions);
            
            return originalIO(url, finalOptions);
        };

        // Copiar propriedades estáticas
        Object.setPrototypeOf(window.io, originalIO);
    }

    // Correção para addEventListener em Safari
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        // Safari pode ter problemas com algumas opções
        if (options && typeof options === 'object') {
            // Garantir que as opções são válidas
            const safeOptions = {
                capture: !!options.capture,
                once: !!options.once,
                passive: options.passive !== false // Safari prefere passive: true
            };
            
            return originalAddEventListener.call(this, type, listener, safeOptions);
        }
        
        return originalAddEventListener.call(this, type, listener, options);
    };

    // Correção para fetch em Safari
    if (typeof fetch !== 'undefined') {
        const originalFetch = fetch;
        window.fetch = function(input, init) {
            // Safari pode precisar de headers específicos
            if (init && init.headers) {
                const headers = new Headers(init.headers);
                
                // Garantir que Content-Type está correto
                if (!headers.has('Content-Type') && init.body) {
                    headers.set('Content-Type', 'application/json');
                }
                
                init.headers = headers;
            }
            
            return originalFetch(input, init);
        };
    }

    // Correção para localStorage em Safari
    if (typeof localStorage !== 'undefined') {
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            try {
                return originalSetItem.call(this, key, value);
            } catch (error) {
                // Safari pode ter problemas com localStorage em modo privado
                console.warn('Erro ao salvar no localStorage:', error);
                // Fallback para sessionStorage
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.setItem(key, value);
                }
            }
        };
    }

    console.log('✅ Polyfills para Safari aplicados com sucesso');
})(); 