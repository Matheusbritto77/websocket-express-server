const express = require('express')
const path = require('path')
const SocketService = require('./SocketService')
const MatchmakingService = require('./MatchmakingService')
const logger = require('./config/logger')

function App(port = 3000) {
    const app = express()
    const http = require('http').createServer(app)
    
    // Middleware
    app.use(express.json())
    app.use(express.static(path.join(__dirname, '../public')))

    // Inicializa o serviço de matchmaking
    const matchmakingService = new MatchmakingService()

    // Rotas
    app.get('/health', (req, res) => {
        res.json({ status: 'UP', timestamp: new Date().toISOString() })
    })

    app.get('/status', (req, res) => {
        res.json({
            status: 'UP',
            timestamp: new Date().toISOString(),
            service: 'websocket-server',
            version: '1.0.0'
        })
    })

    // Endpoint para estatísticas das filas de matchmaking
    app.get('/api/matchmaking/stats', async (req, res) => {
        try {
            const stats = matchmakingService.getQueueStats()
            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            })
        } catch (error) {
            logger.error(`Erro ao obter estatísticas de matchmaking: ${error.message}`)
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                timestamp: new Date().toISOString()
            })
        }
    })

    // Endpoint para forçar limpeza das filas (apenas para desenvolvimento)
    app.post('/api/matchmaking/clear', async (req, res) => {
        try {
            // Limpa as filas
            matchmakingService.queueA = []
            matchmakingService.queueB = []
            matchmakingService.activeMatches.clear()
            
            // Limpa do Redis
            await matchmakingService.redis.del('matchmaking:queue:A')
            await matchmakingService.redis.del('matchmaking:queue:B')
            await matchmakingService.redis.del('matchmaking:active')
            
            res.json({
                success: true,
                message: 'Filas limpas com sucesso',
                timestamp: new Date().toISOString()
            })
        } catch (error) {
            logger.error(`Erro ao limpar filas: ${error.message}`)
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                timestamp: new Date().toISOString()
            })
        }
    })

    // Rota para página principal
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/index.html'))
    })

    // Middleware de tratamento de erros
    app.use((err, req, res, next) => {
        logger.error(`Erro na aplicação: ${err.message}`)
        res.status(500).json({
            error: 'Erro interno do servidor',
            timestamp: new Date().toISOString()
        })
    })

    // Middleware para rotas não encontradas
    app.use((req, res) => {
        res.status(404).json({
            error: 'Rota não encontrada',
            timestamp: new Date().toISOString()
        })
    })

    // Inicializa o SocketService
    SocketService(http)

    // Inicia o servidor
    http.listen(port, () => {
        logger.info(`Servidor iniciado na porta ${port}`)
    })

    return http
}

module.exports = App
