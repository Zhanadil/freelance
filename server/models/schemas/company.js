const mongoose = require('mongoose');

const credentialsSchema = require('@models/schemas/credentials');

// База данных компаний, хранит всю базовую информацию о компании.
// Аккаунты сотрудников также значатся как компания, только будет указан
// айди главного аккаунта.
const companySchema = mongoose.Schema({
    credentials: credentialsSchema,
    name: String,
    isMain: {
        type: Boolean,
        default: true,
    },
    employeeInfo: {
        parentId: String,
        firstName: String,
        lastName: String,
        position: String,
    },
    phone: String,
    description: String,
    vacancies: [String],
});

module.exports = companySchema;
