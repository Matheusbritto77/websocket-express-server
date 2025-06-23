# Compatibilidade com Safari

## Problemas Conhecidos e Soluções

### 1. **WebRTC e getUserMedia**

**Problema**: Safari tem implementação diferente do WebRTC e pode ter problemas com `navigator.mediaDevices.getUserMedia()`.

**Soluções Implementadas**:
- Fallback para versões antigas do getUserMedia
- Configurações específicas de vídeo e áudio para Safari
- Tratamento de erros específicos

**Código**:
```javascript
// Configurações específicas para Safari
const constraints = {
    video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
    },
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
    }
};
```

### 2. **Socket.IO Transport**

**Problema**: Safari pode ter problemas com WebSockets e precisa de fallback para polling.

**Soluções Implementadas**:
- Configuração de transport com polling primeiro para Safari
- Timeout e reconexão otimizados

**Código**:
```javascript
// Safari tem melhor compatibilidade com polling primeiro
if (this.isSafari) {
    socketOptions.transports = ['polling', 'websocket'];
} else {
    socketOptions.transports = ['websocket', 'polling'];
}
```

### 3. **RTCPeerConnection**

**Problema**: Safari tem implementação diferente do WebRTC PeerConnection.

**Soluções Implementadas**:
- Configurações específicas para Safari
- Tratamento especial de SDP (Session Description Protocol)

**Código**:
```javascript
// Safari precisa de configurações específicas
if (this.isSafari) {
    configuration.iceCandidatePoolSize = 10;
    configuration.bundlePolicy = 'max-bundle';
    configuration.rtcpMuxPolicy = 'require';
}
```

### 4. **Chat de Texto - Problemas Específicos**

**Problema**: O chat de texto pode não funcionar corretamente no Safari devido a:
- Eventos de teclado não sendo capturados corretamente
- Eventos de socket não sendo processados adequadamente
- Falta de tratamento de erro específico

**Soluções Implementadas**:
- Adicionado listener `keydown` como fallback para `keypress`
- Melhor tratamento de erros em todos os métodos
- Adicionado evento `partner_left` que estava faltando
- Verificações de conectividade mais robustas

**Código**:
```javascript
// Adicionar listener para keydown como fallback para Safari
this.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage(e);
    }
});

// Evento partner_left que estava faltando
this.socket.on('partner_left', (data) => {
    this.handlePartnerLeft(data);
});
```

### 5. **Event Listeners e Promises**

**Problema**: Safari pode ter problemas com async/await e event listeners.

**Soluções Implementadas**:
- Polyfills para Promise
- Correções em addEventListener
- Tratamento de localStorage em modo privado

### 6. **localStorage em Modo Privado**

**Problema**: Safari em modo privado pode ter problemas com localStorage.

**Soluções Implementadas**:
- Fallback para sessionStorage
- Tratamento de erros específicos

## Arquivos Modificados

### 1. `public/js/video-chat.js`
- Adicionada detecção de Safari
- Configurações específicas para WebRTC
- Fallbacks para getUserMedia
- Configurações específicas para Socket.IO

### 2. `public/js/omegle.js` (Chat de Texto)
- Adicionada detecção de Safari
- Configurações específicas para Socket.IO
- Adicionado listener `keydown` como fallback
- Adicionado evento `partner_left`
- Melhor tratamento de erros em todos os métodos
- Verificações de conectividade mais robustas

### 3. `public/js/safari-polyfills.js` (Novo)
- Polyfills específicos para Safari
- Correções para WebRTC
- Correções para Socket.IO
- Correções para localStorage

### 4. Páginas HTML
- Adicionado script de polyfills antes dos outros scripts

### 5. `public/test-text-chat-safari.html` (Novo)
- Página de teste específica para chat de texto no Safari
- Debug detalhado de todos os eventos
- Testes de conectividade e funcionalidade

## Como Testar

### 1. **Teste de Detecção**
Abra o console do Safari e verifique se aparece:
```
🔧 Aplicando polyfills específicos para Safari
✅ Polyfills para Safari aplicados com sucesso
```

### 2. **Teste de WebRTC**
- Acesse a página de chat de vídeo
- Verifique se as permissões de câmera/microfone funcionam
- Teste a conexão com outro usuário

### 3. **Teste de Chat de Texto**
- Acesse a página de chat de texto
- Use a página de teste: `/test-text-chat-safari.html`
- Verifique se a conexão Socket.IO funciona
- Teste o envio de mensagens
- Teste o botão "Próximo"

### 4. **Teste de Socket.IO**
- Verifique se a conexão WebSocket/polling funciona
- Teste o chat de texto
- Verifique se as mensagens são enviadas/recebidas

### 5. **Teste de localStorage**
- Teste em modo privado
- Verifique se as preferências são salvas

## Página de Teste Específica

Acesse `/test-text-chat-safari.html` para um teste detalhado do chat de texto no Safari. Esta página inclui:

- Detecção automática do Safari
- Teste de API
- Teste de Socket.IO
- Teste de eventos de chat
- Log detalhado de todos os eventos
- Botões para testar cada funcionalidade

## Versões Suportadas

- **Safari 12+**: Suporte completo
- **Safari 11**: Suporte básico (algumas funcionalidades podem não funcionar)
- **Safari 10 e anteriores**: Não suportado

## Troubleshooting

### Problema: "getUserMedia não é suportado"
**Solução**: Verifique se está usando HTTPS (obrigatório para WebRTC)

### Problema: "Socket.IO não conecta"
**Solução**: Verifique se o servidor está rodando e acessível

### Problema: "Vídeo não aparece"
**Solução**: Verifique as permissões de câmera no Safari

### Problema: "Chat de texto não funciona"
**Solução**: 
1. Use a página de teste `/test-text-chat-safari.html`
2. Verifique os logs no console
3. Teste se o Socket.IO está conectando
4. Verifique se o evento `join_chat` está sendo enviado

### Problema: "localStorage não funciona"
**Solução**: Verifique se não está em modo privado ou use sessionStorage

### Problema: "Mensagens não são enviadas"
**Solução**:
1. Verifique se está conectado ao chat
2. Teste com a página de teste
3. Verifique se o evento `message` está sendo emitido
4. Verifique se há erros no console

## Configurações Recomendadas para Safari

### 1. **Configurações do Navegador**
- Habilitar JavaScript
- Permitir câmera e microfone
- Desabilitar bloqueadores de pop-up

### 2. **Configurações de Rede**
- Usar HTTPS
- Permitir WebSockets
- Configurar firewall adequadamente

### 3. **Configurações de Privacidade**
- Permitir cookies
- Permitir localStorage
- Permitir sessionStorage

## Logs de Debug

Para debug, verifique o console do Safari por mensagens como:
- `🔧 RTCPeerConnection configurado para Safari`
- `🔧 Socket.IO configurado para Safari`
- `✅ Polyfills para Safari aplicados com sucesso`
- `Evento join_chat enviado para chat de texto`
- `Socket conectado com ID: [socket-id]`

## Suporte

Se encontrar problemas específicos com Safari, verifique:
1. Versão do Safari
2. Configurações de privacidade
3. Configurações de rede
4. Logs do console
5. Logs do servidor
6. Use a página de teste `/test-text-chat-safari.html` 