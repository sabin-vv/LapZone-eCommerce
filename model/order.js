const mongoose = require("mongoose")


const orderSchema = new mongoose.Schema({

    orderId: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product',
            required: true
        },
        productName: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['Ordered', 'Processing', 'Delivered', 'Returned', 'Cancelled', 'Cancel Requested', 'Return Requested'],
            default: 'Ordered'
        },
        returnReason: {
            type: String,      
        },
        returnComment :{
            type: String
        },
        returnDate: {
            type: Date
        },
        cancelReason: {
            type: String,

        },
        cancelComment: {
            type: String
        },
        cancelDate: {
            type: Date
        },
        cancelRequestDate: {
            type: Date
        },
        returnRequestDate: {
            type: Date
        },

    }],
    subtotal: {
        type: Number,
        required: true
    },

    shippingFee: {
        type: Number,
        required: true
    },
    tax: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    shippingAddress: {
        fullName: { type: String, required: true },
        addressLine: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        postCode: { type: String, required: true },
        phone: { type: String, required: true }
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['COD', 'Online', 'Wallet']
    },
    paymentStatus: {
        type: String,
        required: true,
        enum: ['Pending', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    orderStatus: {
        type: String,
        required: true,
        enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled' ,],
        default: 'Processing'
    },
    statusHistory: [{
        status: {
            type: String,
            required: true,
            enum: ['Ordered', 'Processing', 'Delivered', 'Cancelled', 'Returned', 'Cancel Requested', 'Return Requested','Shipped' ,'Cancel Rejected','Return Rejected' ]
        },
        date: {
            type: Date,
            default: Date.now
        },
        current: {
            type: Boolean,
            default: false
        }
    }]
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order