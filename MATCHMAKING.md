# Sistema de Matchmaking com Filas Alternadas

## 🎯 **Visão Geral**

O sistema de matchmaking implementa um algoritmo de filas alternadas que conecta usuários em pares de forma eficiente e justa. Cada usuário que entra é direcionado para uma das duas filas (A ou B), alternando automaticamente para manter o equilíbrio.

## 🔄 **Como Funciona**

### **1. Sistema de Filas Alternadas**
- **Fila A**: Lado esquerdo da fila
- **Fila B**: Lado direito da fila
- **Alternância**: Usuários são distribuídos alternadamente entre as filas

### **2. Processo de Match**
1. Usuário conecta e entra na fila
2. Sistema determina automaticamente qual fila usar (A ou B)
3. Quando há **2 usuários em cada fila**, um match é criado
4. Os 4 usuários são conectados em uma sala de video chat
5. Se alguém sair, volta para o fim da fila (lado oposto)

### **3. Fluxo Detalhado**

```
Usuário 1 → Fila A (posição 1)
Usuário 2 → Fila B (posição 1)
Usuário 3 → Fila A (posição 2)
Usuário 4 → Fila B (posição 2)
→ MATCH CRIADO! (4 usuários conectados)

Usuário 5 → Fila A (posição 1)
Usuário 6 → Fila B (posição 1)
...
```

## 📡 **Eventos WebSocket**

### **Entrar na Fila**
```javascript
socket.emit('join-queue', {
    username: 'Nome do Usuário' // opcional
});
```

### **Sair da Fila**
```javascript
socket.emit('leave-queue');
```

### **Solicitar Próximo Usuário**
```javascript
socket.emit('next');
```

### **Eventos Recebidos**

#### **Atualização da Fila**
```javascript
socket.on('queue-update', (data) => {
    console.log('Fila:', data.queue); // 'A' ou 'B'
    console.log('Posição:', data.position);
    console.log('Tempo estimado:', data.estimatedWait);
});
```

#### **Match Encontrado**
```javascript
socket.on('match-found', (data) => {
    console.log('Sala:', data.roomId);
    console.log('Usuários:', data.users);
    console.log('Mensagem:', data.message);
});
```

#### **Chamada Iniciada**
```javascript
socket.on('call', (data) => {
    console.log('Sala:', data.roomId);
    console.log('Outros usuários:', data.users);
});
```

#### **Usuário Desconectado**
```javascript
socket.on('disconnect-user', (data) => {
    console.log('Usuário desconectado:', data.id);
});
```

## 🔧 **API Endpoints**

### **Estatísticas das Filas**
```bash
GET /api/matchmaking/stats
```

**Resposta:**
```json
{
    "success": true,
    "data": {
        "queueA": {
            "length": 5,
            "users": [
                {"socketId": "abc123", "username": "User1"},
                {"socketId": "def456", "username": "User2"}
            ]
        },
        "queueB": {
            "length": 3,
            "users": [
                {"socketId": "ghi789", "username": "User3"}
            ]
        },
        "activeMatches": 8,
        "estimatedWaitA": 45,
        "estimatedWaitB": 30
    },
    "timestamp": "2025-06-22T13:30:00.000Z"
}
```

### **Limpar Filas (Desenvolvimento)**
```bash
POST /api/matchmaking/clear
```

## 🧪 **Testes**

### **Rodar Testes do Matchmaking**
```bash
npm run test:matchmaking
```

### **Testes Disponíveis**
- ✅ Adição de usuários às filas
- ✅ Alternância entre filas A e B
- ✅ Criação de matches
- ✅ Remoção de usuários
- ✅ Cálculo de tempo estimado
- ✅ Estatísticas das filas
- ✅ Verificação de matches ativos
- ✅ Remoção de matches
- ✅ Múltiplos matches simultâneos
- ✅ Persistência no Redis

## 🏗️ **Arquitetura**

### **Componentes Principais**

1. **MatchmakingService**: Gerencia as filas e matches
2. **SocketService**: Integra com WebSocket e eventos
3. **Redis**: Persistência das filas e matches ativos
4. **MongoDB**: Armazenamento de usuários e salas

### **Estrutura de Dados**

#### **Usuário na Fila**
```javascript
{
    socketId: "abc123",
    username: "Nome do Usuário",
    timestamp: 1640995200000,
    queue: "A" // ou "B"
}
```

#### **Match Ativo**
```javascript
{
    roomId: "room-uuid-123",
    users: [
        {socketId: "user1", username: "User1", queue: "A"},
        {socketId: "user2", username: "User2", queue: "A"},
        {socketId: "user3", username: "User3", queue: "B"},
        {socketId: "user4", username: "User4", queue: "B"}
    ],
    createdAt: 1640995200000
}
```

## ⚡ **Performance**

### **Características**
- **Escalabilidade**: Suporta múltiplos matches simultâneos
- **Latência**: Match instantâneo quando há usuários suficientes
- **Persistência**: Dados salvos no Redis para recuperação
- **Balanceamento**: Distribuição automática entre filas

### **Estimativas de Tempo**
- **Tempo mínimo**: 30 segundos
- **Tempo por posição**: 15 segundos
- **Fórmula**: `max(30, minQueueLength * 15)`

## 🔒 **Segurança**

### **Validações**
- ✅ Verificação de usuários em salas ativas
- ✅ Limpeza automática de dados órfãos
- ✅ Tratamento de desconexões inesperadas
- ✅ Proteção contra duplicação de usuários

### **Monitoramento**
- ✅ Logs detalhados de todas as operações
- ✅ Estatísticas em tempo real
- ✅ Endpoints de monitoramento
- ✅ Tratamento de erros robusto

## 🚀 **Como Usar**

### **1. Iniciar o Servidor**
```bash
npm start
```

### **2. Conectar via WebSocket**
```javascript
const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('Conectado ao servidor');
    
    // Entrar na fila
    socket.emit('join-queue', {
        username: 'Meu Nome'
    });
});
```

### **3. Monitorar Status**
```bash
curl http://localhost:3000/api/matchmaking/stats
```

## 📊 **Métricas**

### **Monitoramento em Tempo Real**
- Número de usuários em cada fila
- Matches ativos
- Tempo estimado de espera
- Taxa de sucesso de matches

### **Alertas**
- Filas muito longas
- Falhas de match
- Problemas de conectividade
- Performance degradada

---

## 🎉 **Benefícios do Sistema**

1. **Justiça**: Distribuição equilibrada entre filas
2. **Eficiência**: Matches rápidos quando há usuários suficientes
3. **Escalabilidade**: Suporta muitos usuários simultâneos
4. **Confiabilidade**: Persistência e recuperação de dados
5. **Monitoramento**: Visibilidade completa do sistema
6. **Flexibilidade**: Fácil adaptação para diferentes cenários 