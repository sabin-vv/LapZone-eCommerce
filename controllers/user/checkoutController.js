const Cart = require("../../model/cart")
const Address = require("../../model/address")
const { v4: uuidv4 } = require('uuid')
const Order = require("../../model/order")
const Product = require("../../model/products")
const Wallet = require("../../model/wallet")
const Coupon = require("../../model/coupon")

const checkoutPage = async (req, res) => {

  if (!req.session.user) return res.redirect("/")

  const userId = req.session.user

  const addresses = await Address.find({ userId })

  const coupons = await Coupon.find()

  const cart = await Cart.findOne({ userId }).populate('items.productId')

  if (!cart)
    return res.redirect("/cart")

  const wallet = await Wallet.findOne({ userId })
  if (!wallet) {
    wallet = new Wallet({ userId, balance: 0 });
    await wallet.save();
  }

  const subtotal = cart.items.reduce((acc, item) => {
    return acc + item.productId.salePrice * item.quantity;
  }, 0);

  const shippingFee = 50;
  const tax = Math.round(subtotal * 0.05);
  const totalAmount = subtotal + shippingFee + tax;

  const orderSummary = {
    subtotal,
    shippingFee,
    tax,
    totalAmount
  };

  res.render("user/checkoutPage", { addresses, cart: cart.items, orders: [orderSummary], wallet, coupons })

}

const orderplace = async (req, res) => {
  if (!req.session.user) return res.redirect("/");

  const userId = req.session.user;
  const { shippingAddress, paymentMethod, total } = req.body;
  const { appliedCoupon } = req.body


  const couponCode = appliedCoupon?.couponCode || null;
  const couponId = appliedCoupon?.couponId || null;
  const discountAmount = appliedCoupon?.discount || 0;

  const totalPrice = parseFloat(total.replace(/[₹,]/g, ''));

  const cart = await Cart.findOne({ userId }).populate('items.productId');

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ success: false, message: "Cart is empty." });
  }

  const stockIssues = cart.items.filter(item =>
    !item.productId.isExisting ||
    !item.productId.isActive ||
    item.productId.count < item.quantity
  );

  if (stockIssues.length > 0) {
    return res.json({ success: false, message: 'Product Out of Stock' });
  }

  const orderId = 'LPZ-' + uuidv4().replace(/\D/g, '').slice(0, 15);

  let wallet = await Wallet.findOne({ userId })
  if (!wallet) {
    wallet = new Wallet({ userId, balance: 0 });
    await wallet.save();
  }

  let paymentStatus = 'Pending';

  if (paymentMethod === 'Wallet') {

    if (wallet.balance < totalPrice)
      return res.json({ success: false, message: "Not Enough Money" })

    wallet.balance -= totalPrice


    wallet.transactions.push({
      type: 'debit',
      amount: totalPrice,
      description: `Purchase for Order #${orderId}`,
      date: new Date(),
      createdAt: new Date()
    });

    await wallet.save()
    paymentStatus = 'Completed'

  } else if (paymentMethod === 'Online') {
    paymentStatus = 'Completed';
  }

  const orderItems = cart.items.map(item => ({
    productId: item.productId._id,
    productName: item.productId.name,
    quantity: item.quantity,
    price: item.productId.salePrice,
    status: 'Ordered'
  }));

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = 50;
  const tax = Math.round(subtotal * 0.05);
  let totalAmount = subtotal + shippingFee + tax;

  if (appliedCoupon && Object.keys(appliedCoupon).length > 0) {
    totalAmount -= appliedCoupon.discount
  }

  const order = new Order({
    orderId,
    user: userId,
    items: orderItems,
    subtotal,
    shippingFee,
    tax,
    totalAmount,
    shippingAddress,
    paymentMethod,
    paymentStatus,
    orderStatus: 'Processing',
    discountAmount: appliedCoupon?.discount || 0,
    statusHistory: [{ status: 'Processing', current: true }],
    coupon: couponCode ? { coupon: couponCode, couponId, } : undefined,

  });

  await order.save();
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.productId, { $inc: { count: -item.quantity } }, { new: true })
  }
  await Cart.deleteOne({ userId });

  res.json({ success: true, message: 'Order Placed', orderId });
}

const orderPage = async (req, res) => {

  if (!req.session.user) return res.redirect("/")
  const orderId = req.params.id
  const user = req.session.user
  const username = user.fullname
  const order = await Order.findOne({ orderId })


  res.render("user/orderSuccessfullPage", { user, username, order })
}

const orderFailurePafe = (req, res) => {

  res.render("user/orderFailurePage")
}


module.exports = {
  checkoutPage,
  orderplace,
  orderPage,
  orderFailurePafe,
}