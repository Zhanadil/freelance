const mongoose = require('mongoose');

const credentialsSchema = require('@models/schemas/credentials');

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
    belbinResults: [{
        categoryName: String,
        pointsNumber: Number,
        pointsPercentage: Number,
    }]
});

module.exports = studentSchema;
