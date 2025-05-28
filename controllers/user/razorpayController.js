const Razorpay = require("razorpay")


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

const createRazoroay = async (req, res) => {

    const { amount } = req.body;
    
    try {
        const order = await razorpay.orders.create({
            amount: parseInt(amount) * 100, // in paise
            currency: 'INR',
            receipt: 'receipt_' + Date.now()
        });

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error('Razorpay order error:', err);
        res.status(500).json({ success: false, message: 'Failed to create Razorpay order' });
    }

}

module.exports = {
    createRazoroay,

}