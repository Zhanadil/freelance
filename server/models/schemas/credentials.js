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
    forgotPasswordUrl: String,
    forgotPasswordExpirationDate: Date,
    balance: {
        active: {
            type: Number,
            default: 0,
        },
        inactive: {
            type: Number,
            default: 0,
        }
    },
});

credentialsSchema.methods.isValidPassword = async function(newPassword) {
    if (!this.password) {
        return false;
    }

    return await bcrypt.compare(newPassword, this.password);
}

module.exports = credentialsSchema;
