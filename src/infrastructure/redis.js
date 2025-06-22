const redis = require('redis');
const config = require('../config/database');
const logger = require('../config/logger');

class RedisConnection {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            const redisConfig = config.app.nodeEnv === 'production' 
                ? config.redis.internal 
                : config.redis.external;

            this.client = redis.createClient({
                url: redisConfig.url,
                socket: {
                    host: redisConfig.host,
                    port: redisConfig.port
                },
                password: redisConfig.password,
                username: redisConfig.username
            });

            this.client.on('error', (err) => {
                logger.error('Redis Client Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                logger.info('Redis Client Connected');
                this.isConnected = true;
            });

            this.client.on('ready', () => {
                logger.info('Redis Client Ready');
            });

            this.client.on('end', () => {
                logger.info('Redis Client Disconnected');
                this.isConnected = false;
            });

            await this.client.connect();
            return this.client;
        } catch (error) {
            logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.client && this.isConnected) {
            await this.client.quit();
            this.isConnected = false;
        }
    }

    getClient() {
        return this.client;
    }

    isReady() {
        return this.isConnected === true;
    }
}

// Singleton instance
const redisConnection = new RedisConnection();

module.exports = redisConnection; 