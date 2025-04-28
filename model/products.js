const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    modelNumber: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    CPU: {
        type: String,
        required: true,
    },
    OS: {
            type: String,
            required: false,
        },
    screen: {
        type: String,
        required: true
    },
    graphics: {
        type: String,
        required: true
    },
    offer: Number,
    rating: {
        type: Number,
        required: true,
    },
    count: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    variants: [{
        RAM: {
            type: String,
            required: true,
        },
        Storage: {
            type: String,
            required: true,
        },
        priceAdjustment: {
            type: Number,
            default: 0,
        },
    }],
    ports: [{
        "USB Type-A": {
            type: String,
            required: false
        },
        "USB Type-C": {
            type: String,
            required: false,
        },

        "HDMI": {
            type: String,
            required: false,
        },
        "AudioJack": {
            type: String,
            required: false,
        },
        
        "LAN": {
            type: String,
            required: false,
        },
        "Card Reader": {
            type: String,
            required: false,
        }
    }],
    webcam: {
        type: String,
        required: false
    },
    regularPrice: {
        type: Number,
        required: true
    },
    salePrice: {
        type: Number,
        required: true
    },
    warranty: {
        type: String,
        required: true
    },
    images: [{
        url: {
            type: String,
            required: true
        },
        isMain: {
            type: Boolean,
            required:true,
            default: false
        }
    },{ default: [] }]

}, { timestamps: true })

const Product = mongoose.model("product", productSchema)

module.exports = Product