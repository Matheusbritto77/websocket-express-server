const mongoConnection = require('../infrastructure/mongodb');
const Room = require('../models/Room');
const logger = require('../config/logger');

class RoomRepository {
    constructor() {
        this.collection = null;
    }

    async init() {
        try {
            const db = mongoConnection.getDatabase();
            this.collection = db.collection('rooms');
            
            // Criar índices
            await this.collection.createIndex({ roomId: 1 }, { unique: true });
            await this.collection.createIndex({ isActive: 1 });
            await this.collection.createIndex({ currentUsers: 1 });
            await this.collection.createIndex({ createdAt: 1 });
            
            logger.info('RoomRepository initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize RoomRepository:', error);
            throw error;
        }
    }

    async createRoom(roomData) {
        try {
            const room = new Room(roomData);
            const validation = room.validate();
            
            if (validation.error) {
                throw new Error(`Validation error: ${validation.error.details[0].message}`);
            }

            const result = await this.collection.insertOne(room.toJSON());
            logger.info(`Room created: ${room.roomId}`);
            return { ...room.toJSON(), _id: result.insertedId };
        } catch (error) {
            logger.error('Error creating room:', error);
            throw error;
        }
    }

    async findRoomById(roomId) {
        try {
            const room = await this.collection.findOne({ roomId });
            return room ? new Room(room) : null;
        } catch (error) {
            logger.error('Error finding room by id:', error);
            throw error;
        }
    }

    async findAvailableRooms() {
        try {
            const rooms = await this.collection.find({
                isActive: true,
                currentUsers: { $lt: 2 }
            }).toArray();
            
            return rooms.map(room => new Room(room));
        } catch (error) {
            logger.error('Error finding available rooms:', error);
            throw error;
        }
    }

    async updateRoom(roomId, updateData) {
        try {
            const result = await this.collection.updateOne(
                { roomId },
                { 
                    $set: { 
                        ...updateData, 
                        lastActivity: new Date() 
                    } 
                }
            );
            
            if (result.modifiedCount > 0) {
                logger.info(`Room updated: ${roomId}`);
            }
            
            return result.modifiedCount > 0;
        } catch (error) {
            logger.error('Error updating room:', error);
            throw error;
        }
    }

    async incrementUserCount(roomId) {
        try {
            const result = await this.collection.updateOne(
                { roomId },
                { 
                    $inc: { currentUsers: 1 },
                    $set: { lastActivity: new Date() }
                }
            );
            
            if (result.modifiedCount > 0) {
                logger.info(`User count incremented for room: ${roomId}`);
            }
            
            return result.modifiedCount > 0;
        } catch (error) {
            logger.error('Error incrementing user count:', error);
            throw error;
        }
    }

    async decrementUserCount(roomId) {
        try {
            const result = await this.collection.updateOne(
                { roomId },
                { 
                    $inc: { currentUsers: -1 },
                    $set: { lastActivity: new Date() }
                }
            );
            
            if (result.modifiedCount > 0) {
                logger.info(`User count decremented for room: ${roomId}`);
            }
            
            return result.modifiedCount > 0;
        } catch (error) {
            logger.error('Error decrementing user count:', error);
            throw error;
        }
    }

    async deactivateRoom(roomId) {
        try {
            const result = await this.collection.updateOne(
                { roomId },
                { 
                    $set: { 
                        isActive: false, 
                        lastActivity: new Date() 
                    } 
                }
            );
            if (result.modifiedCount > 0) {
                logger.info(`Room deactivated: ${roomId}`);
                // Forçar atualização do objeto no banco
                return true;
            }
            return false;
        } catch (error) {
            logger.error('Error deactivating room:', error);
            throw error;
        }
    }

    async deleteRoom(roomId) {
        try {
            const result = await this.collection.deleteOne({ roomId });
            
            if (result.deletedCount > 0) {
                logger.info(`Room deleted: ${roomId}`);
            }
            
            return result.deletedCount > 0;
        } catch (error) {
            logger.error('Error deleting room:', error);
            throw error;
        }
    }

    async getActiveRoomsCount() {
        try {
            return await this.collection.countDocuments({ isActive: true });
        } catch (error) {
            logger.error('Error getting active rooms count:', error);
            throw error;
        }
    }

    async cleanupInactiveRooms(hours = 24) {
        try {
            const cutoffDate = new Date(Date.now() - (hours * 60 * 60 * 1000));
            const result = await this.collection.deleteMany({
                lastActivity: { $lt: cutoffDate },
                isActive: false,
                currentUsers: 0
            });
            
            if (result.deletedCount > 0) {
                logger.info(`Cleaned up ${result.deletedCount} inactive rooms`);
            }
            
            return result.deletedCount;
        } catch (error) {
            logger.error('Error cleaning up inactive rooms:', error);
            throw error;
        }
    }
}

module.exports = RoomRepository; 