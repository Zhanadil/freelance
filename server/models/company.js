const mongoose = require('mongoose');

const credentialsSchema = require('@models/credentials_schema').credentialsSchema;

// Companies DB
// Company can log in via email, google or [facebook(currently not working)].
// TODO(zhanadil): Add FB registration
// All the information including phone number, photo and user description
// are stored there.
const companySchema = mongoose.Schema({
    credentials: credentialsSchema,
    name: {
        type: String,
        unique: true
    },
    phone: String,
    description: String,
    vacancies: [String],
});

const company = mongoose.model('company', companySchema);

module.exports = company;
