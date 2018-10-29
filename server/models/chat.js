const mongoose = require('mongoose');

const { messageSchema, conversationSchema } = require('@models/schemas/chat');

const Message = mongoose.model('message', messageSchema);
const Conversation = mongoose.model('conversation', conversationSchema);

module.exports = {
    Message,
    Conversation,
};
