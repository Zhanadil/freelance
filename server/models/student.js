const mongoose = require('mongoose');

const credentialsSchema = require('@models/credentials_schema').credentialsSchema;

// Students DB
// Student can log in via email, google or [facebook(currently not working)].
// TODO(zhanadil): Add FB registration
// All the information including phone number, photo and user description
// are stored there.
const studentSchema = mongoose.Schema({
    credentials: credentialsSchema,
    userType: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },
    firstName: String,
    lastName: String,
    phone: String,
    description: String,
    vacancies: [String],
    belbinResults: [{
        categoryName: String,
        pointsNumber: Number,
        pointsPercentage: Number,
    }]
});

const student = mongoose.model('student', studentSchema);

module.exports = student;
