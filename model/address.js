const mongoose = require("mongoose")

const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    fullname: {
        type: String,
        required: true
    },
    mobile: {
        type: Number,
        required: true
    },
    addressLine: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    pincode: {
        type: Number,
        required: true
    },
    landmark: {
        type: String,
        required: false
    },
    isdefault:{
        type:Boolean,
        default:false
    }

},
    { timestamps: true })

   const Address = mongoose.model('Address',addressSchema)
   module.exports = Address