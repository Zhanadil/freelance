const mongoose = require('mongoose');

const fileInfoSchema = mongoose.Schema({
    link: String,
    thumbnail_link: String,
    fileName: String,
    mimeType: String,
    fileType: {
        type: String,
        enum: ['avatar', 'chat', 'document'],
    },
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
