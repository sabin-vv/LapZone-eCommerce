const Razorpay = require("razorpay")
const Cart = require("../../model/cart")
const Order = require("../../model/order")
const { v4: uuidv4 } = require('uuid')


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})

const createRazoroay = async (req, res, next) => {
  const { amount, shippingAddress } = req.body;
  const userId = req.session.user
  try {

    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart)
      return res.status(404).json({ message: 'Cart not found' });

    const order = await razorpay.orders.create({
      amount: parseInt(amount) * 100,
      currency: 'INR',
      receipt: 'receipt_' + Date.now(),
    });

    const orderId = 'LPZ-' + uuidv4().replace(/\D/g, '').slice(0, 15);

    const newOrder = new Order({
      orderId,
      user: userId,
      items: cart.items.map(item => ({
        productId: item.productId._id,
        productName: item.productId.name,
        quantity: item.quantity,
        price: item.productId.salePrice,
        ram:item.ram,
        storage:item.storage,
        status: 'Ordered'
      })),
      subtotal: cart.items.reduce((sum, item) => sum + item.productId.salePrice * item.quantity, 0),
      shippingFee: 50,
      tax: Math.round(cart.items.reduce((sum, item) => sum + item.productId.salePrice * item.quantity, 0) * 0.05),
      totalAmount: parseInt(amount),
      paymentMethod: 'Online',
      paymentStatus: 'Pending',
      orderStatus: 'Processing',
      statusHistory: [{ status: 'Processing', current: true }],
      shippingAddress
    });

    await newOrder.save();

    return res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    next(error);
  }
};

const retryRazorpay = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const userId = req.session.user;


    const order = await Order.findOne({ orderId, user: userId }).populate('user');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const razorpayOrder = await razorpay.orders.create({
      amount: order.totalAmount * 100,
      currency: 'INR',
      receipt: 'retry_' + Date.now()
    });

    order.razorpayOrderId = razorpayOrder.id;
    order.paymentStatus = 'Pending';
    await order.save();


    res.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      key: process.env.RAZORPAY_KEY_ID,
      user: {
        name: order.shippingAddress.fullName,
        email: order.user.email,
        phone: order.shippingAddress.phone
      },
      orderId
    });
  } catch (err) {
    console.error('Retry Razorpay Error:', err);
    next(err);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      orderId
    } = req.body;
    
    const order = await Order.findOne({orderId});
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET_KEY)
      .update(razorpayOrderId + "|" + razorpayPaymentId)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    order.paymentStatus = "Completed";
    order.razorpayPaymentId = razorpayPaymentId;
    await order.save();

    await Cart.findOneAndDelete({ userId: order.user });

    res.render('user/orderSuccessfullPage', { order });

  } catch (error) {
    console.error('Error verifying payment:', error);
    next(error);
  }
};


module.exports = {
  createRazoroay,
  retryRazorpay,
  verifyPayment,

}