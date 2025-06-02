
const Coupon = require("../../model/coupon")
const User = require("../../model/user")


const viewCouponPage = async (req, res) => {

    if (!req.session.admin) return res.redirect("/admin")

    const coupons = await Coupon.find().sort({ createdAt: -1 })

    return res.render('admin/couponPage', { coupons })

}

const newCoupon = (req, res) => {

    if (!req.session.admin) return res.redirect("/admin")

    res.render('admin/addCoupon', { errorfield: null })

}

const addCoupon = async (req, res) => {

    if (!req.session.admin) return res.redirect("/admin")

    const { code, discountType, discountValue, maxDiscountAmount, minPurchaseAmount, startDate, expiryDate } = req.body
    const isActive = req.body.isActive === 'on' ? true : false;

    const errorfield = {}
    if (!code || code.trim() === '') {
        errorfield['code'] = `Coupon cannot be Empty`;
    }
    if (!discountValue)
        errorfield['discountValue'] = 'Discount Value cannot be Empty'

    const dateNow = new Date();
    dateNow.setSeconds(0, 0)

    if (new Date(startDate) < dateNow)
        errorfield['startDate'] = 'Start Date cannot be in the past'
    if (new Date(expiryDate) < dateNow)
        errorfield['expiryDate'] = 'Expiry Date cannot be in tha past'
    if (new Date(expiryDate) < startDate)
        errorfield['expiryDate'] = 'Expiry Date should greater than start Date'

    if (errorfield && Object.keys(errorfield).length > 0)
        return res.render("admin/addCoupon", { errorfield })

    const coupon = await Coupon.findOne({ code })

    if (coupon) {
        errorfield['code'] = 'Coupon Already Exist'
        return res.render("admin/addCoupon", { errorfield })
    }

    const couponData = new Coupon({
        code,
        discountType,
        discountValue,
        maxDiscountAmount,
        minPurchaseAmount,
        startDate,
        expiryDate,
        isActive,

    })

    await couponData.save()

    return res.redirect("/admin/coupon/")

}

const couponStatusChange = async (req, res) => {

    if (!req.session.admin) return res.redirect("/admin")

    const couponId = req.body.id
    const { isActive } = req.body

    const coupon = await Coupon.findById(couponId)
    if (!coupon)
        return res.json({ success: false, message: "Coupon Not found" })

    coupon.isActive = isActive
    await coupon.save()

    return res.json({ success: true, message: "Coupon ststus Updated Successfully" })
}

const editCoupon = async (req, res) => {

    if (!req.session.admin) return res.redirect("/admin")

    const couponId = req.params.id

    const coupon = await Coupon.findById(couponId)

    if (!coupon)
        return res.render("admin/couponPage", { error: "Coupon Not Found" })

    return res.render("admin/editCoupon", { coupon, errorfield: null })

}

const updateCoupon = async (req, res) => {

    if (!req.session.admin) return res.redirect("/admin")

    const couponId = req.params.id;
    const { code, discountType, discountValue, maxDiscountAmount, minPurchaseAmount, startDate, expiryDate, } = req.body
    const isActive = req.body.isActive === 'on' ? true : false;

    const coupon = await Coupon.findById(couponId)

    const errorfield = {}
    if (!code || code.trim() === '') {
        errorfield['code'] = `Coupon cannot be Empty`;
    }
    if (!discountValue)
        errorfield['discountValue'] = 'Discount Value cannot be Empty'

    const dateNow = new Date();
    dateNow.setSeconds(0, 0)

    if (new Date(startDate) < dateNow)
        errorfield['startDate'] = 'Start Date cannot be in the past'
    if (new Date(expiryDate) < dateNow)
        errorfield['expiryDate'] = 'Expiry Date cannot be in tha past'
    if (new Date(expiryDate) < startDate)
        errorfield['expiryDate'] = 'Expiry Date should greater than start Date'

    if (errorfield && Object.keys(errorfield).length > 0)
        return res.render("admin/addCoupon", { errorfield })

    const existingCoupon = await Coupon.findOne({
        code: code.trim().toUpperCase(),
        _id: { $ne: couponId }
    });

    if (existingCoupon)
        return req.render({
            errorfield: { code: "this coupon is Already Exist" }, ...req.body
        })

    const couponData = {
        code,
        discountType,
        discountValue,
        maxDiscountAmount,
        minPurchaseAmount,
        startDate,
        expiryDate,
        isActive
    }
    await Coupon.findByIdAndUpdate(couponId, { $set: { ...couponData } }, { new: true })
    return res.redirect("/admin/coupon")

}

const deleteCoupon = async (req, res) => {


    if (!req.session.admin) return res.redirect("/admin")

    const couponId = req.params.id

    const coupon = await Coupon.findById(couponId)

    if (!coupon)
        return res.json({ success: false, message: "Coupon not Found" })

    await Coupon.findByIdAndDelete(couponId)

    return res.json({ success: true, message: "coupon Deleted Successfully" })

}

module.exports = {
    viewCouponPage,
    newCoupon,
    addCoupon,
    couponStatusChange,
    editCoupon,
    updateCoupon,
    deleteCoupon,

}