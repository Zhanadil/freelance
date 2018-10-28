const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const credentialsSchema = mongoose.Schema({
    method: {
        type: String,
        enum: ['local', 'google'],
    },
    email: {
        type: String,
        lowercase: true,
        unique: true,
    },
    confirmed: {
        type: Boolean,
        default: false,
    },
    confirmationToken: String,
    password: {
        type: String,
        select: false,
    },
    googleId: String,
    forgotPasswordUrl: String,
    forgotPasswordExpirationDate: Date,
});

credentialsSchema.methods.isValidPassword = async function(newPassword) {
    try {
        return await bcrypt.compare(newPassword, this.password);
    } catch(error) {
        throw new Error(error);
    }
}

const temporaryCredentialsSchema = mongoose.Schema({
    method: {
        type: String,
        enum: ['local', 'google'],
    },
    email: {
        type: String,
        lowercase: true,
        unique: true,
    },
    password: String,
    googleId: String
});

temporaryCredentialsSchema.methods.isValidPassword = async function(newPassword) {
    try {
        return await bcrypt.compare(newPassword, this.password);
    } catch(error) {
        throw new Error(error);
    }
}

module.exports = {
    credentialsSchema,
    temporaryCredentialsSchema,
};
