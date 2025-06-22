const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    user1: {
        socketId: String,
        joinedAt: Date,
        leftAt: Date
    },
    user2: {
        socketId: String,
        joinedAt: Date,
        leftAt: Date
    },
    chatType: {
        type: String,
        enum: ['text', 'video'],
        default: 'text'
    },
    status: {
        type: String,
        enum: ['waiting', 'active', 'ended', 'abandoned'],
        default: 'waiting'
    },
    messages: [{
        text: {
            type: String,
            required: true
        },
        sender: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        messageType: {
            type: String,
            enum: ['text', 'system', 'typing'],
            default: 'text'
        }
    }],
    webrtc: {
        offer: Object,
        answer: Object,
        candidates: [Object]
    },
    stats: {
        duration: {
            type: Number,
            default: 0
        },
        messageCount: {
            type: Number,
            default: 0
        },
        startedAt: Date,
        endedAt: Date
    },
    metadata: {
        userAgent: String,
        ipAddress: String,
        country: String,
        language: String
    },
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
chatRoomSchema.index({ roomId: 1 });
chatRoomSchema.index({ status: 1 });
chatRoomSchema.index({ 'user1.socketId': 1 });
chatRoomSchema.index({ 'user2.socketId': 1 });
chatRoomSchema.index({ createdAt: 1 });
chatRoomSchema.index({ 'stats.endedAt': 1 });

// Middleware para atualizar updatedAt
chatRoomSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Métodos estáticos
chatRoomSchema.statics.findByRoomId = function(roomId) {
    return this.findOne({ roomId });
};

chatRoomSchema.statics.findByUserSocketId = function(socketId) {
    return this.findOne({
        $or: [
            { 'user1.socketId': socketId },
            { 'user2.socketId': socketId }
        ],
        status: { $in: ['waiting', 'active'] }
    });
};

chatRoomSchema.statics.getActiveRooms = function() {
    return this.find({ status: 'active' });
};

chatRoomSchema.statics.getRoomStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: null,
                totalRooms: { $sum: 1 },
                activeRooms: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                avgDuration: { $avg: '$stats.duration' },
                avgMessageCount: { $avg: '$stats.messageCount' },
                totalMessages: { $sum: '$stats.messageCount' }
            }
        }
    ]);
};

chatRoomSchema.statics.getRoomsByDateRange = function(startDate, endDate) {
    return this.find({
        createdAt: {
            $gte: startDate,
            $lte: endDate
        }
    });
};

// Métodos de instância
chatRoomSchema.methods.addUser = function(socketId, isUser1 = true) {
    const userField = isUser1 ? 'user1' : 'user2';
    this[userField] = {
        socketId,
        joinedAt: Date.now()
    };
    
    if (this.user1 && this.user2) {
        this.status = 'active';
        this.stats.startedAt = Date.now();
    }
    
    return this.save();
};

chatRoomSchema.methods.removeUser = function(socketId) {
    if (this.user1 && this.user1.socketId === socketId) {
        this.user1.leftAt = Date.now();
    } else if (this.user2 && this.user2.socketId === socketId) {
        this.user2.leftAt = Date.now();
    }
    
    if ((this.user1 && this.user1.leftAt) || (this.user2 && this.user2.leftAt)) {
        this.status = 'ended';
        this.stats.endedAt = Date.now();
        if (this.stats.startedAt) {
            this.stats.duration = this.stats.endedAt - this.stats.startedAt;
        }
    }
    
    return this.save();
};

chatRoomSchema.methods.addMessage = function(text, sender, messageType = 'text') {
    this.messages.push({
        text,
        sender,
        messageType,
        timestamp: Date.now()
    });
    
    this.stats.messageCount += 1;
    return this.save();
};

chatRoomSchema.methods.addWebRTCOffer = function(offer) {
    this.webrtc.offer = offer;
    return this.save();
};

chatRoomSchema.methods.addWebRTCAnswer = function(answer) {
    this.webrtc.answer = answer;
    return this.save();
};

chatRoomSchema.methods.addWebRTCCandidate = function(candidate) {
    this.webrtc.candidates.push(candidate);
    return this.save();
};

chatRoomSchema.methods.endChat = function() {
    this.status = 'ended';
    this.stats.endedAt = Date.now();
    if (this.stats.startedAt) {
        this.stats.duration = this.stats.endedAt - this.stats.startedAt;
    }
    return this.save();
};

// Virtual para verificar se a sala está completa
chatRoomSchema.virtual('isComplete').get(function() {
    return this.user1 && this.user2;
});

// Virtual para obter o outro usuário
chatRoomSchema.virtual('getOtherUser').get(function(socketId) {
    if (this.user1 && this.user1.socketId === socketId) {
        return this.user2;
    } else if (this.user2 && this.user2.socketId === socketId) {
        return this.user1;
    }
    return null;
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema); 