class Room {
    constructor(data = {}) {
        this.roomId = data.roomId;
        this.name = data.name;
        this.maxUsers = data.maxUsers || 2;
        this.currentUsers = data.currentUsers || 0;
        this.isActive = typeof data.isActive === 'boolean' ? data.isActive : true;
        this.createdAt = data.createdAt || new Date();
        this.lastActivity = data.lastActivity || new Date();
        this.settings = data.settings || {
            allowVideo: true,
            allowAudio: true,
            allowScreenShare: false
        };
    }

    static getSchema() {
        return {
            roomId: { type: 'string', required: true },
            name: { type: 'string', required: false },
            maxUsers: { type: 'number', min: 1, max: 10, default: 2 },
            currentUsers: { type: 'number', min: 0, default: 0 },
            isActive: { type: 'boolean', default: true },
            createdAt: { type: 'date', default: Date.now },
            lastActivity: { type: 'date', default: Date.now },
            settings: { 
                type: 'object', 
                default: {
                    allowVideo: true,
                    allowAudio: true,
                    allowScreenShare: false
                }
            }
        };
    }

    validate() {
        const errors = [];
        
        if (!this.roomId || typeof this.roomId !== 'string') {
            errors.push('roomId is required and must be a string');
        }
        
        if (this.name && typeof this.name !== 'string') {
            errors.push('name must be a string');
        }
        
        if (typeof this.maxUsers !== 'number' || this.maxUsers < 1 || this.maxUsers > 10) {
            errors.push('maxUsers must be a number between 1 and 10');
        }
        
        if (typeof this.currentUsers !== 'number' || this.currentUsers < 0) {
            errors.push('currentUsers must be a non-negative number');
        }
        
        if (typeof this.isActive !== 'boolean') {
            errors.push('isActive must be a boolean');
        }
        
        if (this.settings && typeof this.settings !== 'object') {
            errors.push('settings must be an object');
        }
        
        return {
            error: errors.length > 0 ? { details: errors } : null,
            value: this
        };
    }

    toJSON() {
        return {
            roomId: this.roomId,
            name: this.name,
            maxUsers: this.maxUsers,
            currentUsers: this.currentUsers,
            isActive: this.isActive,
            createdAt: this.createdAt,
            lastActivity: this.lastActivity,
            settings: this.settings
        };
    }

    isFull() {
        return this.currentUsers >= this.maxUsers;
    }

    canJoin() {
        return this.isActive && !this.isFull();
    }
}

module.exports = Room; 