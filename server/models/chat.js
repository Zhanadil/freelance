const { fileInfoSchema } = require('@models/file_schemas');

const mongoose = require('mongoose');

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
    companyId: String,
    studentId: String,
    lastMessage: messageSchema,
});

const Message = mongoose.model('message', messageSchema);
const Conversation = mongoose.model('conversation', conversationSchema);

module.exports = {
    Message,
    Conversation,
};
