const mongoose = require('mongoose');
const to = require('await-to-js').default;

const companySchema = require('@models/schemas/company');

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
