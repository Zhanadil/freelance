const mongoose = require('mongoose');

const fileInfoSchema = mongoose.Schema({
    link: String,
    thumbnail_link: String,
    name: String,
    mimeType: String,
    type: {
        type: String,
        enum: ['avatar', 'chat', 'document'],
    },
    size: Number,
    conversationId: String,
});

const fileSchema = mongoose.Schema({
    ownerType: {
        type: String,
        enum: ['company', 'student'],
    },
    ownerId: String,
    fileInfo: fileInfoSchema,
});

module.exports = {
    fileInfoSchema,
    fileSchema,
};
