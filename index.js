require('dotenv').config();
const SERVER_PORT = process.env.PORT || 3000;
const OmegleServer = require('./src/OmegleServer');
const databaseManager = require('./src/config/database');

async function startServer() {
    try {
        // Conectar com todos os bancos de dados
        console.log('🔄 Iniciando conexões com bancos de dados...');
        await databaseManager.connectAll();
        
        // Iniciar o servidor Omegle
        console.log('🚀 Iniciando servidor Omegle...');
        const server = new OmegleServer(SERVER_PORT);
        server.start();

        console.log(`✅ Servidor Omegle iniciado na porta ${SERVER_PORT}`);
        console.log(`📊 API disponível em: http://localhost:${SERVER_PORT}`);
        console.log(`🎯 Estatísticas: http://localhost:${SERVER_PORT}/api/stats`);
        console.log(`🔗 Redis: ${process.env.REDIS_EXTERNAL_URL || 'redis://default:Setcel2@@@168.231.95.211:6379'}`);
        console.log(`📦 MongoDB: ${process.env.MONGO_EXTERNAL_URL || 'mongodb://localhost:27017/chatdb'}`);
        console.log(`🐘 PostgreSQL: postgresql://${process.env.PG_USER || 'PostgresSocker2D@'}@${process.env.PG_EXTERNAL_HOST || '168.231.95.211'}:${process.env.PG_EXTERNAL_PORT || '5432'}/${process.env.PG_DATABASE || 'postgresSocket'}`);

        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Recebido sinal de interrupção, encerrando servidor...');
            await databaseManager.disconnectAll();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('\n🛑 Recebido sinal de término, encerrando servidor...');
            await databaseManager.disconnectAll();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

startServer();