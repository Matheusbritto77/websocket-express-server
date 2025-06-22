class User {
    constructor(data = {}) {
        this.socketId = data.socketId;
        this.roomId = data.roomId;
        this.username = data.username;
        this.isOnline = (typeof data.isOnline !== 'undefined') ? data.isOnline : true;
        this.createdAt = data.createdAt || new Date();
        this.lastSeen = data.lastSeen || new Date();
        this.connectionData = data.connectionData || {};
    }

    static getSchema() {
        return {
            socketId: { type: 'string', required: true },
            roomId: { type: 'string', required: true },
            username: { type: 'string', required: false },
            isOnline: { type: 'boolean', default: true },
            createdAt: { type: 'date', default: Date.now },
            lastSeen: { type: 'date', default: Date.now },
            connectionData: { type: 'object', default: {} }
        };
    }

    validate() {
        const errors = [];
        
        if (!this.socketId || typeof this.socketId !== 'string') {
            errors.push('socketId is required and must be a string');
        }
        
        if (!this.roomId || typeof this.roomId !== 'string') {
            errors.push('roomId is required and must be a string');
        }
        
        if (this.username && typeof this.username !== 'string') {
            errors.push('username must be a string');
        }
        
        if (typeof this.isOnline !== 'boolean') {
            errors.push('isOnline must be a boolean');
        }
        
        return {
            error: errors.length > 0 ? { details: errors } : null,
            value: this
        };
    }

    toJSON() {
        return {
            socketId: this.socketId,
            roomId: this.roomId,
            username: this.username,
            isOnline: this.isOnline,
            createdAt: this.createdAt,
            lastSeen: this.lastSeen,
            connectionData: this.connectionData
        };
    }
}

module.exports = User; 