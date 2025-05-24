const mongoose = require ('mongoose')



const walletSchema = new  mongoose.Schema({
    userId:{
        type:mongoose.Types.ObjectId,
        ref:'user',
        unique:true,
        required:true
    },
    balance:{
        type:Number,
        default:0,
        min:0
    },
    transactions:[{
        type:{
            type:String,
            enum:['credit','debit'],
            required: true
        },
        amount:{
            type:Number,
            required: true
        },
        description:{
            type:String,
            required:true
        },
        date:{
            type: Date,
            default:Date.now
        },
        createdAt:{
            type:Date,
            default:Date.now
        }
    }]

},{timestamps:true})

const Wallet = mongoose.model('wallet', walletSchema)
module.exports = Wallet