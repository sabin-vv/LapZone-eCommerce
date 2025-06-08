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
        ram:{
            type:String,
            required:true
        },
        storage:{
            type:String,
            required:true
        },
        price:  {
            type: Number,
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