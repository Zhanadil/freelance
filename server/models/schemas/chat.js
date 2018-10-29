const mongoose = require('mongoose');

const { fileInfoSchema } = require('@models/schemas/file');

const messageSchema = mongoose.Schema({
    authorId: String,
    authorType: {
        type: String,
        enum: ['student', 'company'],
    },
    conversationId: String,
    messageType: {
        type: String,
        enum: ['text'],
    },
    text: String,
    files: [fileInfoSchema],
    timeSent: {
        type: Date,
        default: Date.now,
    },
});

const conversationSchema = mongoose.Schema({
    company: {
        id: String,
        name: String,
        isMain: Boolean,
        firstName: String,
        lastName: String,
        position: String,
    },
    student: {
        id: String,
        firstName: String,
        lastName: String,
    },
    lastMessage: messageSchema,
});

module.exports = {
    messageSchema,
    conversationSchema
};
