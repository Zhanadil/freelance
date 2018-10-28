const { fileSchema } = require('@models/file_schemas');

const mongoose = require('mongoose');

module.exports = mongoose.model('file', fileSchema);
