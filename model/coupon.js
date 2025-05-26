const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'], 
        required: true
    },
    discountValue: {
        type: Number,
        required: true
    },
    maxDiscountAmount: {
        type: Number, 
        default: null
    },
    minPurchaseAmount: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    usageLimit: {
        type: Number,
        default: null
    },
    usedCount: {
        type: Number,
        default: 0
    },
    usageLimitPerUser: {
        type: Number,
        default: 1
    },
    isActive: {
        type: Boolean,
        default: true
    },
}, {
    timestamps: true
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;