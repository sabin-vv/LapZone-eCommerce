const mongoose = require("mongoose")

const cartSchema = mongoose.Schema({

    userId: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Types.ObjectId,
            ref: 'product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
}, { timestamps: true })

const Cart = mongoose.model("cart", cartSchema)
module.exports = Cart