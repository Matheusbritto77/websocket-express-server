// Debug helper para identificar problemas de comunicação
(function() {
    'use strict';
    
    console.log('🔧 Debug helper carregado');
    
    // Monitorar todas as promises
    const originalPromise = window.Promise;
    window.Promise = function(executor) {
        const promise = new originalPromise(executor);
        
        promise.catch(function(error) {
            console.warn('⚠️ Promise rejeitada capturada:', error);
        });
        
        return promise;
    };
    
    // Monitorar fetch requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        console.log('🌐 Fetch request:', args[0]);
        return originalFetch.apply(this, args).catch(function(error) {
            console.warn('⚠️ Fetch error:', error);
            throw error;
        });
    };
    
    // Monitorar XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        console.log('📡 XHR request:', method, url);
        return originalXHROpen.apply(this, [method, url, ...args]);
    };
    
    // Monitorar WebSocket
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        console.log('🔌 WebSocket connection:', url);
        const ws = new originalWebSocket(url, protocols);
        
        ws.addEventListener('error', function(event) {
            console.warn('⚠️ WebSocket error:', event);
        });
        
        return ws;
    };
    
    // Monitorar erros de script
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const element = originalCreateElement.call(this, tagName);
        
        if (tagName.toLowerCase() === 'script') {
            element.addEventListener('error', function(event) {
                console.warn('⚠️ Script error:', event);
            });
        }
        
        return element;
    };
    
    console.log('✅ Debug helper configurado');
})(); 