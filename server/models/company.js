const mongoose = require('mongoose');

const credentialsSchema = require('@models/credentials_schema').credentialsSchema;

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

const company = mongoose.model('company', companySchema);

module.exports = company;
