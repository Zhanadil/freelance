const mongoose = require('mongoose');

const studentSchema = require('@models/schemas/student');

const student = mongoose.model('student', studentSchema);

module.exports = student;
