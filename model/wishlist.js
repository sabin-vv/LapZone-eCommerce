const mongoose = require("mongoose")


const wishListschema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product',
            required: true
        }

    }],

}, { timestamps: true })

const wishlist = mongoose.model('wishlist',wishListschema)
module.exports = wishlist 