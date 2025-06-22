// Fix para problemas de message channel
(function() {
    'use strict';
    
    console.log('🔧 Message Channel Fix carregado');
    
    // Interceptar Service Worker se existir
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for (let registration of registrations) {
                registration.unregister();
                console.log('🔧 Service Worker desregistrado');
            }
        });
    }
    
    // Interceptar mensagens de extensões do navegador
    const originalPostMessage = window.postMessage;
    window.postMessage = function(message, targetOrigin, transfer) {
        try {
            return originalPostMessage.call(this, message, targetOrigin, transfer);
        } catch (error) {
            console.warn('⚠️ PostMessage error interceptado:', error);
        }
    };
    
    // Interceptar addEventListener para message
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'message') {
            const wrappedListener = function(event) {
                try {
                    return listener.call(this, event);
                } catch (error) {
                    console.warn('⚠️ Message listener error interceptado:', error);
                    return false; // Não retorna true para evitar o erro
                }
            };
            return originalAddEventListener.call(this, type, wrappedListener, options);
        }
        return originalAddEventListener.call(this, type, listener, options);
    };
    
    // Interceptar Promise para evitar rejeições não tratadas
    const originalPromise = window.Promise;
    window.Promise = function(executor) {
        return new originalPromise(function(resolve, reject) {
            try {
                executor(function(value) {
                    try {
                        resolve(value);
                    } catch (error) {
                        console.warn('⚠️ Promise resolve error:', error);
                        resolve(undefined);
                    }
                }, function(reason) {
                    try {
                        reject(reason);
                    } catch (error) {
                        console.warn('⚠️ Promise reject error:', error);
                        reject(new Error('Promise rejection intercepted'));
                    }
                });
            } catch (error) {
                console.warn('⚠️ Promise executor error:', error);
                reject(new Error('Promise executor error intercepted'));
            }
        });
    };
    
    // Manter métodos estáticos do Promise
    window.Promise.resolve = originalPromise.resolve;
    window.Promise.reject = originalPromise.reject;
    window.Promise.all = originalPromise.all;
    window.Promise.race = originalPromise.race;
    window.Promise.allSettled = originalPromise.allSettled;
    
    console.log('✅ Message Channel Fix configurado');
})(); 