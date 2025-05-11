const mongoose  = require("mongoose")


const wishListschema = new mongoose.Schema({
    userId : {
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
        required:true
    },
    items:[{

    }]

})