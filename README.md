# WebSocket Video Chat Server

Servidor de video chat P2P usando WebSocket, Redis e MongoDB com arquitetura modular em camadas.

## 🏗️ Arquitetura

O projeto segue uma arquitetura em camadas:

```
src/
├── config/          # Configurações (banco, logger)
├── infrastructure/  # Conexões com Redis e MongoDB
├── models/          # Modelos de dados (User, Room)
├── repositories/    # Camada de acesso a dados
├── tests/           # Sistema completo de testes
└── SocketService.js # Serviço principal de WebSocket
```

## 🧪 Sistema de Testes

### Estrutura de Testes

```
src/tests/
├── setup.js                    # Configuração global
├── *.test.js                   # Testes unitários
├── integration/                # Testes de integração
│   └── WebSocketIntegration.test.js
├── api/                        # Testes de API
│   └── HealthCheck.test.js
├── performance/                # Testes de performance
│   └── LoadTest.test.js
├── security/                   # Testes de segurança
│   └── SecurityTest.test.js
├── edge-cases/                 # Casos extremos
│   └── EdgeCases.test.js
├── mocks/                      # Testes com mocks
│   └── MockTests.test.js
└── e2e/                        # Testes end-to-end
    └── EndToEnd.test.js
```

### Tipos de Testes

#### 1. **Testes Unitários** (`src/tests/*.test.js`)
- Testam componentes isolados
- Repositórios (UserRepository, RoomRepository)
- Conexões (Redis, MongoDB)
- Modelos (User, Room)

#### 2. **Testes de Integração** (`src/tests/integration/`)
- Testam comunicação entre componentes
- WebSocket com múltiplos clientes
- Troca de mensagens WebRTC
- Fluxos de conexão/desconexão

#### 3. **Testes de API** (`src/tests/api/`)
- Endpoints de health check
- Validação de respostas HTTP
- Status do sistema

#### 4. **Testes de Performance** (`src/tests/performance/`)
- Múltiplas conexões simultâneas
- Processamento de mensagens
- Estabilidade com reconexões

#### 5. **Testes de Segurança** (`src/tests/security/`)
- Validação de payloads maliciosos
- Proteção contra injeção de SQL
- Limitação de tamanho de mensagens
- Validação de IDs de socket

#### 6. **Testes de Edge Cases** (`src/tests/edge-cases/`)
- Dados vazios ou nulos
- Caracteres especiais
- IDs muito longos
- Operações simultâneas
- Falhas de conexão

#### 7. **Testes com Mocks** (`src/tests/mocks/`)
- Isolamento de componentes
- Simulação de falhas
- Testes sem dependências externas

#### 8. **Testes End-to-End** (`src/tests/e2e/`)
- Fluxos completos de video chat
- Múltiplas salas simultâneas
- Reconexão de clientes

## 🚀 Como Executar os Testes

### Instalação
```bash
npm install
```

### Comandos de Teste

```bash
# Todos os testes
npm test

# Testes em modo watch
npm run test:watch

# Testes com cobertura
npm run test:coverage

# Testes específicos
npm run test:unit          # Apenas testes unitários
npm run test:integration   # Apenas testes de integração
npm run test:api           # Apenas testes de API
npm run test:performance   # Apenas testes de performance
npm run test:security      # Apenas testes de segurança
npm run test:e2e           # Apenas testes end-to-end
npm run test:edge          # Apenas edge cases
npm run test:mocks         # Apenas testes com mocks
```

### Configuração de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Configurações do Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# Configurações do MongoDB
MONGO_URL=mongodb://localhost:27017/websocket_chat

# Configurações da Aplicação
NODE_ENV=test
PORT=3333
```

### Executando Testes Específicos

```bash
# Teste específico
npm test -- --testNamePattern="deve criar um usuário"

# Teste com arquivo específico
npm test -- UserRepository.test.js

# Teste com verbose
npm test -- --verbose

# Teste com timeout personalizado
npm test -- --testTimeout=60000
```

## 📊 Cobertura de Testes

Para gerar relatório de cobertura:

```bash
npm run test:coverage
```

Isso irá gerar:
- Relatório no terminal
- Arquivos HTML em `coverage/`
- Relatório detalhado por arquivo

## 🔧 Configuração do Jest

O Jest está configurado no `package.json`:

```json
{
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.js"],
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/tests/**"
    ],
    "setupFilesAfterEnv": ["<rootDir>/src/tests/setup.js"],
    "testTimeout": 30000
  }
}
```

## 🐛 Debugging de Testes

### Logs Detalhados
```bash
# Habilitar logs detalhados
DEBUG=* npm test

# Logs específicos do Jest
npm test -- --verbose
```

### Teste Individual
```bash
# Executar apenas um teste
npm test -- --testNamePattern="nome do teste"
```

### Timeout Personalizado
```bash
# Aumentar timeout para testes lentos
npm test -- --testTimeout=60000
```

## 📈 Métricas de Qualidade

### Cobertura Mínima Recomendada
- **Linhas de código**: 80%
- **Funções**: 85%
- **Branches**: 75%

### Tipos de Teste por Prioridade
1. **Alta**: Testes unitários e de integração
2. **Média**: Testes de API e segurança
3. **Baixa**: Testes de performance e edge cases

## 🚨 Troubleshooting

### Problemas Comuns

1. **Timeout em testes de integração**
   - Aumentar `testTimeout` no Jest
   - Verificar conexões com Redis/MongoDB

2. **Falhas de conexão**
   - Verificar se Redis e MongoDB estão rodando
   - Checar configurações no `.env`

3. **Testes lentos**
   - Usar mocks para testes unitários
   - Separar testes de integração

4. **Vazamentos de memória**
   - Verificar `afterAll` e `afterEach`
   - Fechar conexões adequadamente

### Dicas de Performance

- Execute testes unitários primeiro
- Use `--runInBand` para testes sequenciais
- Configure `--maxWorkers` para paralelização
- Use mocks para testes isolados

## 📝 Contribuindo

### Adicionando Novos Testes

1. Crie o arquivo na pasta apropriada
2. Siga o padrão de nomenclatura `*.test.js`
3. Use `describe` e `it` do Jest
4. Adicione `beforeAll`, `afterAll` quando necessário
5. Execute `npm test` para verificar

### Padrões de Teste

```javascript
describe('Nome do Componente', () => {
  beforeAll(async () => {
    // Setup
  });

  afterAll(async () => {
    // Cleanup
  });

  it('deve fazer algo específico', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## 🔗 Links Úteis

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Socket.IO Testing](https://socket.io/docs/v4/testing/)
- [MongoDB Testing](https://docs.mongodb.com/drivers/node/current/fundamentals/testing/)
- [Redis Testing](https://redis.io/topics/testing) 