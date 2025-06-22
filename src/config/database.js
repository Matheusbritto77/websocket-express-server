const redis = require('redis');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const mongoClient = require('./mongo');
require('dotenv').config();

class DatabaseManager {
    constructor() {
        this.redisClient = null;
        this.mongoConnection = null;
        this.postgresPool = null;
    }

    // Configuração Redis
    async connectRedis() {
        try {
            this.redisClient = redis.createClient({
                url: process.env.REDIS_EXTERNAL_URL || 'redis://default:Setcel2@@@168.231.95.211:6379',
                password: process.env.REDIS_PASSWORD || undefined,
                database: parseInt(process.env.REDIS_DB) || 0
            });

            this.redisClient.on('error', (err) => {
                console.error('❌ Erro na conexão Redis:', err);
            });

            this.redisClient.on('connect', () => {
                console.log('✅ Redis conectado com sucesso');
            });

            await this.redisClient.connect();
            return this.redisClient;
        } catch (error) {
            console.error('❌ Falha ao conectar com Redis:', error);
            throw error;
        }
    }

    // Configuração MongoDB
    async connectMongoDB() {
        try {
            const mongoUrl = process.env.MONGO_EXTERNAL_URL || 'mongodb://localhost:27017/chatdb';
            
            console.log(`🔗 Tentando conectar MongoDB: ${mongoUrl.replace(/\/\/.*@/, '//***:***@')}`);
            
            await mongoose.connect(mongoUrl, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
            });

            this.mongoConnection = mongoose.connection;

            this.mongoConnection.on('connected', () => {
                console.log('✅ MongoDB conectado com sucesso');
            });

            this.mongoConnection.on('error', (err) => {
                console.error('❌ Erro na conexão MongoDB:', err);
            });

            this.mongoConnection.on('disconnected', () => {
                console.log('⚠️ MongoDB desconectado');
            });

            return this.mongoConnection;
        } catch (error) {
            console.error('❌ Falha ao conectar com MongoDB:', error);
            console.log('🔄 Continuando sem MongoDB...');
            return null;
        }
    }

    // Configuração PostgreSQL
    async connectPostgreSQL() {
        try {
            this.postgresPool = new Pool({
                host: process.env.PG_EXTERNAL_HOST || '168.231.95.211',
                port: parseInt(process.env.PG_EXTERNAL_PORT) || 5432,
                database: process.env.PG_DATABASE || 'postgresSocket',
                user: process.env.PG_USER || 'PostgresSocker2D@',
                password: process.env.PG_PASSWORD || 'Setcel2@@',
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });

            // Testar conexão
            const client = await this.postgresPool.connect();
            await client.query('SELECT NOW()');
            client.release();

            console.log('✅ PostgreSQL conectado com sucesso');
            return this.postgresPool;
        } catch (error) {
            console.error('❌ Falha ao conectar com PostgreSQL:', error);
            throw error;
        }
    }

    // Conectar todos os bancos
    async connectAll() {
        try {
            console.log('🔄 Iniciando conexões com bancos de dados...');
            
            // Conectar Redis e PostgreSQL (obrigatórios)
            await Promise.all([
                this.connectRedis(),
                this.connectPostgreSQL()
            ]);

            // Tentar conectar MongoDB (opcional)
            try {
                await this.connectMongoDB();
            } catch (mongoError) {
                console.log('⚠️ MongoDB não disponível, continuando sem...');
            }

            console.log('✅ Conexões estabelecidas com sucesso');
        } catch (error) {
            console.error('❌ Erro ao conectar bancos de dados:', error);
            throw error;
        }
    }

    // Desconectar todos os bancos
    async disconnectAll() {
        try {
            console.log('🔄 Desconectando bancos de dados...');
            
            if (this.redisClient) {
                await this.redisClient.quit();
                console.log('✅ Redis desconectado');
            }

            if (this.mongoConnection) {
                await mongoose.disconnect();
                console.log('✅ MongoDB desconectado');
            }

            if (this.postgresPool) {
                await this.postgresPool.end();
                console.log('✅ PostgreSQL desconectado');
            }
        } catch (error) {
            console.error('❌ Erro ao desconectar bancos de dados:', error);
        }
    }

    // Getters para as conexões
    getRedisClient() {
        return this.redisClient;
    }

    getMongoConnection() {
        return this.mongoConnection;
    }

    getMongoClient() {
        return mongoClient;
    }

    getPostgresPool() {
        return this.postgresPool;
    }
}

module.exports = new DatabaseManager(); 