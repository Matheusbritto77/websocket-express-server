// WebRTC Helper - Funções auxiliares para melhorar a estabilidade das conexões

// Cache de conexões para evitar duplicatas
const connectionCache = new Map();

// Função para criar conexão WebRTC com melhor tratamento de erros
function createStablePeerConnection(userId) {
    // Verificar se já existe uma conexão para este usuário
    if (connectionCache.has(userId)) {
        const existingConnection = connectionCache.get(userId);
        if (existingConnection.signalingState !== 'closed') {
            log('warn', `Conexão já existe para ${userId} - reutilizando`);
            return existingConnection;
        } else {
            // Remover conexão fechada do cache
            connectionCache.delete(userId);
        }
    }

    const pc = createSafeRTCConfig();
    
    // Adicionar ao cache
    connectionCache.set(userId, pc);
    
    // Configurar handlers de estado
    pc.onconnectionstatechange = function() {
        log('info', `Connection state for ${userId}:`, pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            connectionCache.delete(userId);
        }
    };

    pc.oniceconnectionstatechange = function() {
        log('info', `ICE connection state for ${userId}:`, pc.iceConnectionState);
    };

    pc.onsignalingstatechange = function() {
        log('info', `Signaling state for ${userId}:`, pc.signalingState);
    };

    return pc;
}

// Função para limpar conexões antigas
function cleanupConnections() {
    for (const [userId, pc] of connectionCache.entries()) {
        if (pc.signalingState === 'closed' || pc.connectionState === 'closed') {
            connectionCache.delete(userId);
            log('info', `Conexão limpa para ${userId}`);
        }
    }
}

// Função para processar candidatos ICE com retry
function processIceCandidate(pc, candidate, maxRetries = 3) {
    let retryCount = 0;
    
    function attemptAddCandidate() {
        if (!pc || pc.signalingState === 'closed') {
            log('warn', 'Conexão fechada, não é possível adicionar candidato');
            return;
        }

        if (!pc.remoteDescription) {
            log('info', 'Remote description não definida, candidato será processado depois');
            return;
        }

        pc.addIceCandidate(candidate).catch(function(error) {
            log('error', `Erro ao adicionar ICE candidate (tentativa ${retryCount + 1}):`, error);
            
            if (error.name === 'InvalidStateError' && retryCount < maxRetries) {
                retryCount++;
                log('info', `Tentativa ${retryCount} de adicionar candidato em 200ms`);
                setTimeout(attemptAddCandidate, 200);
            } else {
                log('error', 'Falha ao adicionar candidato após todas as tentativas');
            }
        });
    }
    
    attemptAddCandidate();
}

// Função para definir remote description com retry
function setRemoteDescriptionWithRetry(pc, description, maxRetries = 3) {
    let retryCount = 0;
    
    function attemptSetRemoteDescription() {
        if (!pc || pc.signalingState === 'closed') {
            log('warn', 'Conexão fechada, não é possível definir remote description');
            return new Promise((resolve, reject) => {
                reject(new Error('Connection closed'));
            });
        }

        if (pc.signalingState === 'stable') {
            log('warn', 'Conexão já em estado stable, ignorando remote description');
            return new Promise((resolve) => {
                resolve();
            });
        }

        return pc.setRemoteDescription(description).catch(function(error) {
            log('error', `Erro ao definir remote description (tentativa ${retryCount + 1}):`, error);
            
            if (error.name === 'InvalidStateError' && retryCount < maxRetries) {
                retryCount++;
                log('info', `Tentativa ${retryCount} de definir remote description em 100ms`);
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        attemptSetRemoteDescription().then(resolve).catch(reject);
                    }, 100);
                });
            } else {
                return new Promise((resolve, reject) => {
                    reject(error);
                });
            }
        });
    }
    
    return attemptSetRemoteDescription();
}

// Função para processar candidatos pendentes quando a conexão estiver pronta
function processPendingCandidates(user) {
    if (user.pendingCandidates && user.pendingCandidates.length > 0 && isConnectionReadyForCandidates(user.pc)) {
        log('info', `Processando ${user.pendingCandidates.length} candidatos pendentes para ${user.id}`);
        user.pendingCandidates.forEach(candidate => {
            processIceCandidate(user.pc, candidate);
        });
        user.pendingCandidates = [];
        return true;
    }
    return false;
}

// Função para verificar se uma conexão está pronta para receber candidatos
function isConnectionReadyForCandidates(pc) {
    return pc && 
           pc.remoteDescription && 
           pc.signalingState !== 'closed' && 
           pc.connectionState !== 'closed';
}

// Função para verificar se uma conexão está pronta para receber offers/answers
function isConnectionReadyForSignaling(pc) {
    return pc && 
           pc.signalingState !== 'closed' && 
           pc.connectionState !== 'closed';
}

// Função para limpar todas as conexões
function clearAllConnections() {
    for (const [userId, pc] of connectionCache.entries()) {
        if (pc) {
            pc.close();
        }
    }
    connectionCache.clear();
    log('info', 'Todas as conexões foram limpas');
}

// Exportar funções se estiver em ambiente Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createStablePeerConnection,
        cleanupConnections,
        processIceCandidate,
        setRemoteDescriptionWithRetry,
        processPendingCandidates,
        isConnectionReadyForCandidates,
        isConnectionReadyForSignaling,
        clearAllConnections
    };
} 