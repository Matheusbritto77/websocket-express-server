const { MongoClient } = require('mongodb');
const config = require('../config/database');
const logger = require('../config/logger');

class MongoDBConnection {
    constructor() {
        this.client = null;
        this.db = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            const mongoConfig = config.app.nodeEnv === 'production' 
                ? config.mongodb.internal 
                : config.mongodb.external;

            this.client = new MongoClient(mongoConfig.url, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            await this.client.connect();
            this.db = this.client.db('websocket_chat');
            this.isConnected = true;

            logger.info('MongoDB Connected Successfully');

            // Test the connection
            await this.db.admin().ping();
            logger.info('MongoDB Ping Successful');

            return this.db;
        } catch (error) {
            logger.error('Failed to connect to MongoDB:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect() {
        if (this.client && this.isConnected) {
            await this.client.close();
            this.isConnected = false;
            logger.info('MongoDB Disconnected');
        }
    }

    getDatabase() {
        return this.db;
    }

    getClient() {
        return this.client;
    }

    isReady() {
        return this.isConnected && this.db;
    }

    async healthCheck() {
        try {
            if (!this.isReady()) {
                return false;
            }
            await this.db.admin().ping();
            return true;
        } catch (error) {
            logger.error('MongoDB Health Check Failed:', error);
            return false;
        }
    }
}

// Singleton instance
const mongoConnection = new MongoDBConnection();

module.exports = mongoConnection; 