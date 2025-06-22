const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    socketId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        trim: true,
        maxlength: 50
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    chatHistory: [{
        roomId: String,
        messages: [{
            text: String,
            timestamp: {
                type: Date,
                default: Date.now
            },
            isFromUser: Boolean
        }],
        partnerId: String,
        duration: Number,
        endedAt: Date
    }],
    preferences: {
        language: {
            type: String,
            default: 'pt-BR'
        },
        theme: {
            type: String,
            default: 'light'
        },
        notifications: {
            type: Boolean,
            default: true
        }
    },
    stats: {
        totalChats: {
            type: Number,
            default: 0
        },
        totalMessages: {
            type: Number,
            default: 0
        },
        totalTime: {
            type: Number,
            default: 0
        },
        firstSeen: {
            type: Date,
            default: Date.now
        }
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    blockReason: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Índices para melhor performance
userSchema.index({ socketId: 1 });
userSchema.index({ isOnline: 1 });
userSchema.index({ lastSeen: 1 });
userSchema.index({ createdAt: 1 });

// Middleware para atualizar lastSeen
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Métodos estáticos
userSchema.statics.findBySocketId = function(socketId) {
    return this.findOne({ socketId });
};

userSchema.statics.getOnlineUsers = function() {
    return this.find({ isOnline: true });
};

userSchema.statics.getUserStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                onlineUsers: { $sum: { $cond: ['$isOnline', 1, 0] } },
                avgTotalChats: { $avg: '$stats.totalChats' },
                avgTotalMessages: { $avg: '$stats.totalMessages' }
            }
        }
    ]);
};

// Métodos de instância
userSchema.methods.updateLastSeen = function() {
    this.lastSeen = Date.now();
    return this.save();
};

userSchema.methods.addChatHistory = function(roomId, messages, partnerId, duration) {
    this.chatHistory.push({
        roomId,
        messages,
        partnerId,
        duration,
        endedAt: Date.now()
    });
    
    this.stats.totalChats += 1;
    this.stats.totalMessages += messages.length;
    this.stats.totalTime += duration || 0;
    
    return this.save();
};

userSchema.methods.toggleOnlineStatus = function(isOnline) {
    this.isOnline = isOnline;
    if (!isOnline) {
        this.lastSeen = Date.now();
    }
    return this.save();
};

module.exports = mongoose.model('User', userSchema); 