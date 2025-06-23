require("dotenv").config();
const mongoose = require('mongoose');
const GroupMessage = require('../models/GroupMessage');
const logger = require('./logger');

class MongoService {
    constructor() {
        this.isConnected = false;
    }

    async connect() {
        try {
            const mongoUrl = process.env.MONGO_EXTERNAL_URL || process.env.MONGO_URL || 'mongodb://localhost:27017/stranger_chat';
            
            logger.info(`🔄 Conectando ao MongoDB: ${mongoUrl.replace(/\/\/.*@/, '//***@')}`);
            
            // Conectar com mongoose
            await mongoose.connect(mongoUrl, {
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 15000,
                socketTimeoutMS: 45000,
            });

            this.isConnected = true;
            
            logger.info('✅ MongoDB conectado com sucesso via mongoose');
            
            // Testar se o modelo está funcionando
            try {
                const testCount = await GroupMessage.countDocuments();
                logger.info(`📊 Teste do modelo: ${testCount} mensagens encontradas`);
            } catch (modelError) {
                logger.error('❌ Erro ao testar modelo GroupMessage:', modelError);
            }
            
            // Criar índices TTL para mensagens dos grupos
            await this.createTTLIndexes();
            
        } catch (error) {
            logger.warn('⚠️ MongoDB não disponível:', error.message);
            this.isConnected = false;
        }
    }

    async createTTLIndexes() {
        try {
            if (!this.isConnected) return;

            // Índice TTL para mensagens dos grupos (24 horas)
            await GroupMessage.collection.createIndex(
                { createdAt: 1 },
                { expireAfterSeconds: 86400 }
            );

            // Índice composto para consultas por grupo
            await GroupMessage.collection.createIndex(
                { groupId: 1, createdAt: -1 }
            );

            logger.info('✅ Índices TTL criados no MongoDB');
        } catch (error) {
            logger.error('❌ Erro ao criar índices TTL:', error);
        }
    }

    async disconnect() {
        if (this.isConnected) {
            await mongoose.disconnect();
            this.isConnected = false;
            logger.info('🔌 MongoDB desconectado');
        }
    }

    // Métodos para mensagens dos grupos
    async addGroupMessage(groupId, userId, socketId, message, senderName, isRegisteredUser) {
        try {
            if (!this.isConnected) {
                logger.warn('MongoDB não disponível para salvar mensagem do grupo');
                return null;
            }

            const groupMessage = new GroupMessage({
                groupId,
                userId,
                socketId,
                message,
                senderName,
                isRegisteredUser
            });

            const savedMessage = await groupMessage.save();
            logger.info(`💬 Mensagem do grupo ${groupId} salva no MongoDB`);
            
            return savedMessage;
        } catch (error) {
            logger.error('❌ Erro ao salvar mensagem do grupo no MongoDB:', error);
            return null;
        }
    }

    async getGroupMessages(groupId, limit = 50, offset = 0) {
        try {
            if (!this.isConnected) {
                logger.warn('MongoDB não disponível para buscar mensagens do grupo');
                return [];
            }

            const messages = await GroupMessage.find({ groupId })
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit)
                .lean();

            // Retornar em ordem cronológica (mais antigas primeiro)
            return messages.reverse();
        } catch (error) {
            logger.error('❌ Erro ao buscar mensagens do grupo no MongoDB:', error);
            return [];
        }
    }

    async getGroupMessagesByTimeRange(groupId, hours = 24) {
        try {
            if (!this.isConnected) {
                logger.warn('MongoDB não disponível para buscar mensagens do grupo por período');
                return [];
            }

            const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

            const messages = await GroupMessage.find({
                groupId,
                createdAt: { $gte: cutoffTime }
            })
            .sort({ createdAt: 1 })
            .lean();

            return messages;
        } catch (error) {
            logger.error('❌ Erro ao buscar mensagens do grupo por período no MongoDB:', error);
            return [];
        }
    }

    async getGroupMessageStats(groupId) {
        try {
            if (!this.isConnected) {
                return { total: 0, last24h: 0 };
            }

            const total = await GroupMessage.countDocuments({ groupId });
            
            const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000));
            const last24h = await GroupMessage.countDocuments({
                groupId,
                createdAt: { $gte: cutoffTime }
            });

            return { total, last24h };
        } catch (error) {
            logger.error('❌ Erro ao buscar estatísticas de mensagens do grupo:', error);
            return { total: 0, last24h: 0 };
        }
    }

    async cleanupOldMessages() {
        try {
            if (!this.isConnected) return;

            const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000));
            const result = await GroupMessage.deleteMany({
                createdAt: { $lt: cutoffTime }
            });

            if (result.deletedCount > 0) {
                logger.info(`🧹 ${result.deletedCount} mensagens antigas removidas do MongoDB`);
            }
        } catch (error) {
            logger.error('❌ Erro ao limpar mensagens antigas:', error);
        }
    }
}

module.exports = new MongoService(); 