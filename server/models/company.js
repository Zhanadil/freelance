const mongoose = require('mongoose');
const to = require('await-to-js').default;

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

const Company = mongoose.model('company', companySchema);

// ******************************** UTIL **********************************

const allEmployees = async (companyId) => {
    const [err, companies] = await to(
        Company.find({
            'employeeInfo.parentId': companyId
        })
    );
    if (err) {
        throw err;
    }

    return companies;
}

module.exports = {
    Company,
    CompanyUtil: {
        allEmployees
    }
};
