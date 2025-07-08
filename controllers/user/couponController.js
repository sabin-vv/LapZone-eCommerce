const Coupon = require("../../model/coupon")
const Cart = require('../../model/cart')
const Order = require("../../model/order")
const User = require("../../model/user")

const applyCoupon = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/");

        const { code } = req.body;
        const userId = req.session.user;

        if (req.session.appliedCoupon && req.session.appliedCoupon.code === code.toUpperCase()) {
            return res.json({ success: false, message: "Coupon already applied" });
        }

        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

        const dateNow = new Date();
        dateNow.setSeconds(0, 0);

        if (!coupon || coupon.expiryDate < dateNow)
            return res.json({ success: false, message: "Invalid Coupon" });

        if (coupon.startDate > dateNow)
            return res.json({ success: false, message: "Coupon is not yet valid" });

        const userOrdersWithCoupon = await Order.countDocuments({
            user: userId,
            "coupon.code": code,
        });

        if (userOrdersWithCoupon >= coupon.usageLimitPerUser) {
            return res.json({ success: false, message: "This coupon is already used" });
        }

        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            populate: {
                path: 'categoryId',
                model: 'category'
            }
        });

        if (!cart || cart.items.length === 0) {
            return res.json({ success: false, message: "Cart is empty" });
        }

        const subtotal = cart.items.reduce((acc, item) => {
            const product = item.productId;
            const variant = product.variants.find(v => v.RAM === item.ram && v.Storage === item.storage);
            if (!variant) return acc;

            const basePrice = product.salePrice + (variant.priceAdjustment || 0);
            const productOffer = product.offer || 0;
            const categoryOffer = product.categoryId?.offer || 0;
            const maxOffer = Math.max(productOffer, categoryOffer);
            const finalPrice = Math.round(basePrice * (1 - maxOffer / 100));

            return acc + finalPrice * item.quantity;
        }, 0);

        if (coupon.minPurchaseAmount && subtotal < coupon.minPurchaseAmount) {
            return res.json({
                success: false,
                message: `Minimum purchase of ₹${coupon.minPurchaseAmount} required`,
            });
        }

        if (coupon.discountType === 'percentage' && coupon.maxDiscountAmount && subtotal < coupon.maxDiscountAmount) {
            return res.json({ success: false, message: `Subtotal must be at least ₹${coupon.maxDiscountAmount} to use this coupon`, });
        }

        if (
            coupon.discountType === 'fixed' &&
            subtotal < coupon.discountValue
        ) {
            return res.json({
                success: false,
                message: `Product price must be at least ₹${coupon.discountValue} to use this coupon`,
            });
        }

        const shippingFee = 50;

        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = Math.round(subtotal * coupon.discountValue / 100);
            if (coupon.maxDiscountAmount) {
                discount = Math.min(discount, coupon.maxDiscountAmount);
            }
        } else {
            discount = coupon.discountValue;
        }

        const amountAfterDiscount = Math.max(subtotal - discount, 0);
        const tax = Math.round(amountAfterDiscount * 0.05);
        let totalAmount = amountAfterDiscount + shippingFee + tax;

        if (totalAmount < 0) {
            return res.json({
                success: false,
                message: "This coupon discount exceeds the total order value",
            });
        }

        await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
        req.session.appliedCoupon = {
            code: coupon.code,
            couponId: coupon._id,
            discount
        };

        return res.json({
            success: true,
            totalAmount,
            discount,
            tax,
            couponCode: coupon.code,
            couponId: coupon._id,
            message: `Coupon applied! You saved ₹${discount.toLocaleString('en-IN')}`
        });

    } catch (error) {
        console.error('Error applying coupon:', error);
        next(error);
    }
};

const viewCouponPage = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/login")
        const user = await User.findById(req.session.user)

        const coupons = await Coupon.find({ isActive: true }).sort({createdAt: -1})

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