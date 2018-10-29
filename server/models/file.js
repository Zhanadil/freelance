const mongoose = require('mongoose');

const { fileSchema } = require('@models/schemas/file');

module.exports = mongoose.model('file', fileSchema);
