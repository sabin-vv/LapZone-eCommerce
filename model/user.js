const mongoose = require("mongoose")


const userSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    mobile: {
        type: Number,
        unique: false,
        required: false
    },
    password: {
        type: String,
        required: false
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },

}, { timestamps: true })

const User = mongoose.model("user", userSchema)

module.exports = User