const { authorize } = require('passport')

require('dotenv').config()
const axios = require(axios)

const razorpatAuthHeader = {
    header: {
        authorization: "Basic " +
            Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64"),
    }
}

module.exports = { axios, razorpatAuthHeader }