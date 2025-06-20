const Coupon = require("../../model/coupon")
const Cart = require('../../model/cart')
const Order = require("../../model/order")
const User = require("../../model/user")

const applyCoupon = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/")

        const { code } = req.body
        if (req.session.appliedCoupon && req.session.appliedCoupon.code === code.toUpperCase()) {
            return res.json({
                success: false,
                message: "Coupon already applied"
            });
        }
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true })

        const dateNow = new Date();
        dateNow.setSeconds(0, 0)

        if (!coupon || coupon.expiryDate < dateNow)
            return res.json({ success: false, message: "Invalid Coupon" })
        if (coupon.startDate > dateNow)
            return res.json({ success: false, message: "Coupon is not yet valid" });

        const userId = req.session.user;
        const userOrdersWithCoupon = await Order.countDocuments({
            user: userId,
            "coupon.code": code,
        })

        if (userOrdersWithCoupon >= coupon.usageLimitPerUser) {
            return res.json({ success: false, message: "Coupon usage limit per user reached" });
        }

        const cart = await Cart.findOne({ userId: req.session.user }).populate("items.productId")

        const subtotal = cart.items.reduce((acc, item) => {
            const product = item.productId;
            const quantity = item.quantity;

            const productOffer = product.offer || 0;
            const categoryOffer = product.categoryId?.offer || 0;
            const maxOffer = Math.max(productOffer, categoryOffer);

            const basePrice = product.salePrice;
            const discountedPrice = Math.round(basePrice * (1 - maxOffer / 100));

            return acc + discountedPrice * quantity;
        }, 0);

        if (coupon.minPurchaseAmount && subtotal < coupon.minPurchaseAmount) {
            return res.json({
                success: false,
                message: `Minimum purchase of ₹${coupon.minPurchaseAmount} required`,
            });
        }

        const shippingFee = 50;
        const tax = Math.round(subtotal * 0.05);
        let totalAmount = subtotal + shippingFee + tax;
        let discount = 0

        if (coupon.discountType === 'percentage') {
            discount = Math.round(totalAmount * coupon.discountValue / 100)
            if (discount > coupon.maxDiscountAmount) {
                discount = coupon.maxDiscountAmount
            }
            totalAmount -= discount

            await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });

            req.session.appliedCoupon = {
                code: coupon.code,
                couponId: coupon._id
            };

            return res.json({
                success: true,
                totalAmount,
                discount,
                couponCode: coupon.code,
                couponId: coupon._id, message: `Coupon applied! You saved ₹${discount.toLocaleString('en-IN')}`
            })
        } else {
            discount = coupon.discountValue
            totalAmount -= discount
            if (totalAmount < 0)
                return res.json({ success: false, message: "This coupon can't applied to this Order" });
            await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
            req.session.appliedCoupon = {
                code: coupon.code,
                couponId: coupon._id
            };
            return res.json({
                success: true,
                totalAmount,
                discount,
                couponCode: coupon.code,
                couponId: coupon._id, message: `Coupon applied! You saved ₹${discount.toLocaleString('en-IN')}`
            })
        }

    } catch (error) {
        console.error('Error applying coupon:', error);
        next(error);
    }
}

const viewCouponPage = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/login")
        const user = await User.findById(req.session.user)

        const coupons = await Coupon.find({ isActive: true })

        return res.render("user/viewCouponPage", { coupons, user })
    } catch (error) {
        console.error('Error fetching coupons:', error);
        next(error);
    }
}

module.exports = {
    applyCoupon,
    viewCouponPage,

}