const mongoose = require('mongoose');

const { applicationSchema, taskSchema } = require('@models/schemas/task');

const Application = mongoose.model('application', applicationSchema);
const Vacancy = mongoose.model('task', taskSchema);

module.exports = {
    Application,
    Vacancy,
};
