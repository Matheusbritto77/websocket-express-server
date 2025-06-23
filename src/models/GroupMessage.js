const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
    groupId: {
        type: Number,
        required: true,
        index: true
    },
    userId: {
        type: Number,
        default: null
    },
    socketId: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true,
        maxlength: 1000
    },
    senderName: {
        type: String,
        required: true,
        maxlength: 100
    },
    isRegisteredUser: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400 // 24 horas em segundos
    }
}, {
    timestamps: true
});

// Índices para performance
groupMessageSchema.index({ groupId: 1, createdAt: -1 });
groupMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const GroupMessage = mongoose.model('GroupMessage', groupMessageSchema);

module.exports = GroupMessage; 