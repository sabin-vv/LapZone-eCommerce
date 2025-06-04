const Cart = require("../../model/cart")
const Address = require("../../model/address")
const { v4: uuidv4 } = require('uuid')
const Order = require("../../model/order")
const Product = require("../../model/products")
const Wallet = require("../../model/wallet")
const Coupon = require("../../model/coupon")
const User = require("../../model/user")

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

  res.render("user/checkoutPage", { addresses, cart: cart.items, orders: [orderSummary], wallet, coupons, errors: null })

}

const orderplace = async (req, res) => {
  if (!req.session.user) return res.redirect("/");

  const userId = req.session.user;
  const { shippingAddress, paymentMethod, total } = req.body;
  const { appliedCoupon } = req.body
  console.log("Payment method ", paymentMethod)


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
  } else if (paymentMethod === 'COD') {
    if (totalPrice > 1000) {
      return res.json({ success: false, message: "COD is not available for orders above ₹1000" })
    }
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

const editAddress = async (req, res) => {

  try {


    const isAjax = req.headers.accept && req.headers.accept.includes("application/json")
    const userId = req.session.user
    const addressId = req.params.id


    if (!req.body || Object.keys(req.body).length === 0) {
      console.error("Request body is empty or undefined")
      if (isAjax) {
        return res.status(400).json({
          success: false,
          message: "No data received. Please check form submission.",
        })
      }
      return res.status(400).send("Bad Request: No data received")
    }

    const {
      fullname = "",
      mobile = "",
      phone = "",
      addressLine = "",
      district = "",
      state = "",
      city = "",
      pincode = "",
      landmark = "",
      addressType = "Home",
    } = req.body


    const mobileNumber = mobile || phone

    const errors = {}
    const fields = { fullname, mobile: mobileNumber, addressLine, district, state, city, pincode }

    if (!fullname || !/^[A-Za-z\s]{3,20}$/.test(fullname)) {
      errors.fullname = "Name must contain only letters and spaces (3-20 chars)"
    }

    if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
      errors.phone = "Mobile must be 10 digits"
    }

    if (!pincode || pincode.length !== 6 || !/^\d+$/.test(pincode)) {
      errors.pincode = "Pincode must be 6 digits"
    }
    // Validate text fields
    ;["state", "district", "city"].forEach((field) => {
      const value = req.body[field]
      if (!value || !/^[A-Za-z\s-]+$/.test(value)) {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} must contain only letters`
      }
    })

    // Check required fields
    Object.entries(fields).forEach(([key, val]) => {
      if (!val || val.trim() === "") {
        errors[key] = `${key} is required`
      }
    })

    if (Object.keys(errors).length > 0) {

      if (isAjax) {
        return res.status(400).json({ success: false, errors })
      }
      return res.render("user/checkoutPage", { errors })
    }

    // Update address
    const addressData = {
      userId,
      fullname: fullname.trim(),
      mobile: mobileNumber,
      addressLine: addressLine.trim(),
      district: district.trim(),
      state: state.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      landmark: landmark ? landmark.trim() : "",
      addresstype: addressType,
    }



    const updatedAddress = await Address.findByIdAndUpdate(addressId, addressData, { new: true, runValidators: true })

    if (!updatedAddress) {
      if (isAjax) {
        return res.status(404).json({ success: false, message: "Address not found" })
      }
      return res.status(404).send("Address not found")
    }



    if (isAjax) {
      return res.json({ success: true, message: "Address updated successfully" })
    }

    res.redirect("/user/checkout")
  } catch (error) {
    console.error("Error updating address:", error)

    const isAjax = req.headers.accept && req.headers.accept.includes("application/json")
    if (isAjax) {
      return res.status(500).json({
        success: false,
        message: "Internal server error while updating address",
      })
    }

    res.status(500).send("Internal Server Error")
  }

}

const addAddress = async (req, res) => {
  try {
    console.log("Add address request body:", req.body)

    const isAjax = req.headers.accept && req.headers.accept.includes("application/json")
    const userId = req.session.user

    // Check if req.body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error("Request body is empty or undefined")
      if (isAjax) {
        return res.status(400).json({
          success: false,
          message: "No data received. Please check form submission.",
        })
      }
      return res.status(400).send("Bad Request: No data received")
    }

    // Destructure with fallback values
    const {
      fullname = "",
      mobile = "",
      addressLine = "",
      district = "",
      state = "",
      city = "",
      pincode = "",
      landmark = "",
      addressType = "Home",
      isDefault = false,
    } = req.body

    const errors = {}
    const fields = { fullname, mobile, addressLine, district, state, city, pincode }

    // Validation
    if (!fullname || !/^[A-Za-z\s]{3,20}$/.test(fullname)) {
      errors.fullname = "Name must contain only letters and spaces (3-20 chars)"
    }

    if (!mobile || !/^\d{10}$/.test(mobile)) {
      errors.mobile = "Mobile must be 10 digits"
    }

    if (!pincode || pincode.length !== 6 || !/^\d+$/.test(pincode)) {
      errors.pincode = "Pincode must be 6 digits"
    }
    // Validate text fields
    ;["state", "district", "city"].forEach((field) => {
      const value = req.body[field]
      if (!value || !/^[A-Za-z\s-]+$/.test(value)) {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} must contain only letters`
      }
    })

    // Check required fields
    Object.entries(fields).forEach(([key, val]) => {
      if (!val || val.trim() === "") {
        errors[key] = `${key} is required`
      }
    })

    if (Object.keys(errors).length > 0) {
      console.log("Validation errors:", errors)
      if (isAjax) {
        return res.status(400).json({ success: false, errors })
      }
      return res.render("user/checkoutPage", { errors })
    }

    // Create new address
    const addressData = {
      userId,
      fullname: fullname.trim(),
      mobile: mobile.trim(),
      addressLine: addressLine.trim(),
      district: district.trim(),
      state: state.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      landmark: landmark ? landmark.trim() : "",
      addresstype: addressType,
      isdefault: isDefault === "on" || isDefault === true,
    }

    console.log("Creating new address with data:", addressData)

    // If this is set as default, unset any existing default address
    if (addressData.isdefault) {
      await Address.updateMany({ userId: userId, isdefault: true }, { $set: { isdefault: false } })
    }

    // Create the new address
    const newAddress = await Address.create(addressData)

    console.log("Address created successfully:", newAddress)

    if (isAjax) {
      return res.json({
        success: true,
        message: "Address added successfully",
        address: newAddress,
      })
    }

    res.redirect("/user/checkout")
  } catch (error) {
    console.error("Error adding address:", error)

    const isAjax = req.headers.accept && req.headers.accept.includes("application/json")
    if (isAjax) {
      return res.status(500).json({
        success: false,
        message: "Internal server error while adding address",
      })
    }

    res.status(500).send("Internal Server Error")
  }
}


module.exports = {
  checkoutPage,
  orderplace,
  orderPage,
  orderFailurePafe,
  editAddress,
  addAddress,
}