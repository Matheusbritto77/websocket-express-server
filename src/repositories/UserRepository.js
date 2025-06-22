const mongoConnection = require('../infrastructure/mongodb');
const User = require('../models/User');
const logger = require('../config/logger');

class UserRepository {
    constructor() {
        this.collection = null;
    }

    async init() {
        try {
            const db = mongoConnection.getDatabase();
            this.collection = db.collection('users');
            
            // Criar índices
            await this.collection.createIndex({ socketId: 1 }, { unique: true });
            await this.collection.createIndex({ roomId: 1 });
            await this.collection.createIndex({ isOnline: 1 });
            
            logger.info('UserRepository initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize UserRepository:', error);
            throw error;
        }
    }

    async createUser(userData) {
        try {
            const user = new User(userData);
            const validation = user.validate();
            
            if (validation.error) {
                throw new Error(`Validation error: ${validation.error.details[0].message}`);
            }

            const result = await this.collection.insertOne(user.toJSON());
            logger.info(`User created: ${user.socketId}`);
            return { ...user.toJSON(), _id: result.insertedId };
        } catch (error) {
            logger.error('Error creating user:', error);
            throw error;
        }
    }

    async findUserBySocketId(socketId) {
        try {
            const user = await this.collection.findOne({ socketId });
            return user ? new User(user) : null;
        } catch (error) {
            logger.error('Error finding user by socketId:', error);
            throw error;
        }
    }

    async findUsersByRoomId(roomId) {
        try {
            const users = await this.collection.find({ roomId, isOnline: true }).toArray();
            return users.map(user => new User(user));
        } catch (error) {
            logger.error('Error finding users by roomId:', error);
            throw error;
        }
    }

    async updateUser(socketId, updateData) {
        try {
            const result = await this.collection.updateOne(
                { socketId },
                { 
                    $set: { 
                        ...updateData, 
                        lastSeen: new Date() 
                    } 
                }
            );
            
            if (result.modifiedCount > 0) {
                logger.info(`User updated: ${socketId}`);
            }
            
            return result.modifiedCount > 0;
        } catch (error) {
            logger.error('Error updating user:', error);
            throw error;
        }
    }

    async deleteUser(socketId) {
        try {
            const result = await this.collection.deleteOne({ socketId });
            
            if (result.deletedCount > 0) {
                logger.info(`User deleted: ${socketId}`);
            }
            
            return result.deletedCount > 0;
        } catch (error) {
            logger.error('Error deleting user:', error);
            throw error;
        }
    }

    async setUserOffline(socketId) {
        try {
            const result = await this.collection.updateOne(
                { socketId },
                { 
                    $set: { 
                        isOnline: false, 
                        lastSeen: new Date() 
                    } 
                }
            );
            if (result.modifiedCount > 0) {
                logger.info(`User set offline: ${socketId}`);
                // Forçar atualização do objeto no banco
                return true;
            }
            return false;
        } catch (error) {
            logger.error('Error setting user offline:', error);
            throw error;
        }
    }

    async getOnlineUsersCount() {
        try {
            return await this.collection.countDocuments({ isOnline: true });
        } catch (error) {
            logger.error('Error getting online users count:', error);
            throw error;
        }
    }

    async cleanupInactiveUsers(hours = 24) {
        try {
            const cutoffDate = new Date(Date.now() - (hours * 60 * 60 * 1000));
            const result = await this.collection.deleteMany({
                lastSeen: { $lt: cutoffDate },
                isOnline: false
            });
            
            if (result.deletedCount > 0) {
                logger.info(`Cleaned up ${result.deletedCount} inactive users`);
            }
            
            return result.deletedCount;
        } catch (error) {
            logger.error('Error cleaning up inactive users:', error);
            throw error;
        }
    }
}

module.exports = UserRepository; 