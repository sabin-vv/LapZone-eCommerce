const Wishlist = require("../model/wishlist");
const Cart = require("../model/cart");
const Order = require("../model/order");

const counts = async (req, res, next) => {
    if (req.session.user) {
        const userId = req.session.user;
        const wishlist = await Wishlist.findOne({ userId }).select('items')
        const wishlistCount = wishlist ? wishlist.items.length :0
        const cart = await Cart.findOne({ userId }).select('items')
        const cartCount = cart ? cart.items.length :0
        const orderCount = await Order.countDocuments({ user: userId });

        res.locals.wishlistCount = wishlistCount||0;
        res.locals.orderCount = orderCount||0;
        res.locals.cartCount = cartCount||0;
    } else {
      res.locals.wishlistCount = 0;
      res.locals.cartCount = 0;
      res.locals.orderCount = 0;
    }
    next();
}

module.exports = counts;