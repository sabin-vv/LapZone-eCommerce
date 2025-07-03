
const Coupon = require("../../model/coupon")
const User = require("../../model/user")


const viewCouponPage = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin")

        const coupons = await Coupon.find().sort({ createdAt: -1 })

        return res.render('admin/couponPage', { coupons })
    } catch (error) {
        console.error('Error fetching coupons:', error);
        next(error);
    }

}

const newCoupon = (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin")

        res.render('admin/addCoupon', { errorfield: null, formData: null })
    } catch (error) {
        console.error('Error fetching coupons:', error);
        next(error);
    }

}

const addCoupon = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin")

        const { code, discountType, discountValue, maxDiscountAmount, minPurchaseAmount, startDate, expiryDate } = req.body
        const isActive = req.body.isActive === 'on' ? true : false;
        const formData = req.body

        const errorfield = {}
        if (!code || code.trim() === '') {
            errorfield['code'] = `Coupon cannot be Empty`;
        }
        if (!discountValue) {
            errorfield['discountValue'] = 'Discount Value cannot be Empty'
        } else if (isNaN(discountValue)) {
            errorfield['discountValue'] = 'Discount Value must be a number'
        } else if (discountType === 'percentage') {
            const numericValue = Number(discountValue);
            if (numericValue < 0 || numericValue > 100) {
                errorfield['discountValue'] = 'Discount Value should be between 0 and 100';
            }
        } else if (discountType === 'fixed') {
            if (isNaN(discountValue)) {
                errorfield['discountValue'] = 'Discount Value must be a number'
            } else if (discountValue < 0) {
                errorfield['discountValue'] = 'Discount Value should be positive'
            } else if (minPurchaseAmount < discountValue) {
                errorfield['minPurchaseAmount'] = 'Minimum Purchase Amount should be greater than or equal to Discount Value'
            }
        }
        const dateNow = new Date();
        dateNow.setSeconds(0, 0)

        if (new Date(startDate) < dateNow)
            errorfield['startDate'] = 'Start Date cannot be in the past'
        if (new Date(expiryDate) < dateNow)
            errorfield['expiryDate'] = 'Expiry Date cannot be in tha past'
        if (new Date(expiryDate) < startDate)
            errorfield['expiryDate'] = 'Expiry Date should greater than start Date'

        if (errorfield && Object.keys(errorfield).length > 0)
            return res.render("admin/addCoupon", { errorfield, formData })

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

        return res.redirect("/admin/coupons/")
    } catch (error) {
        console.error('Error fetching coupons:', error);
        next(error);
    }

}

const couponStatusChange = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin")

        const couponId = req.body.id
        const { isActive } = req.body

        const coupon = await Coupon.findById(couponId)
        if (!coupon)
            return res.json({ success: false, message: "Coupon Not found" })

        coupon.isActive = isActive
        await coupon.save()

        return res.json({ success: true, message: "Coupon ststus Updated Successfully" })
    } catch (error) {
        console.error('Error fetching coupons:', error);
        next(error);
    }
}

const editCoupon = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin")

        const couponId = req.params.id

        const coupon = await Coupon.findById(couponId)

        if (!coupon)
            return res.render("admin/couponPage", { error: "Coupon Not Found" })

        // Format dates properly for datetime-local input (local timezone)
        const formatDateTimeLocal = (date) => {
            if (!date) return '';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        return res.render("admin/editCoupon", {
            coupon: {
                ...coupon.toObject(),
                startDateISO: formatDateTimeLocal(coupon.startDate),
                expiryDateISO: formatDateTimeLocal(coupon.expiryDate),
            }, errorfield : null
        })
    } catch (error) {
        console.error('Error fetching coupons:', error);
        next(error);
    }

}

const updateCoupon = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin")

        const couponId = req.params.id;
        const { code, discountType, discountValue, maxDiscountAmount, minPurchaseAmount, startDate, expiryDate, } = req.body
        const isActive = req.body.isActive === 'on' ? true : false;

        const coupon = await Coupon.findById(couponId)

        const errorfield = {}
        if (!code || code.trim() === '') {
            errorfield['code'] = `Coupon cannot be Empty`;
        }
        if (!discountValue) {
            errorfield['discountValue'] = 'Discount Value cannot be Empty'
        } else if (isNaN(discountValue)) {
            errorfield['discountValue'] = 'Discount Value must be a number'
        } else if (discountType === 'percentage') {
            const numericValue = Number(discountValue);
            if (numericValue < 0 || numericValue > 100) {
                errorfield['discountValue'] = 'Discount Value should be between 0 and 100';
            }
        } else if (discountType === 'fixed') {
            if (isNaN(discountValue)) {
                errorfield['discountValue'] = 'Discount Value must be a number'
            } else if (discountValue < 0) {
                errorfield['discountValue'] = 'Discount Value should be positive'
            } else if (minPurchaseAmount < discountValue) {
                errorfield['minPurchaseAmount'] = 'Minimum Purchase Amount should be greater than or equal to Discount Value'
            }
        }

        const dateNow = new Date();
        dateNow.setSeconds(0, 0)

        // No start date validation when updating - allow any start date
        if (new Date(expiryDate) < dateNow)
            errorfield['expiryDate'] = 'Expiry Date cannot be in tha past'

        if (errorfield && Object.keys(errorfield).length > 0)
            return res.render("admin/editCoupon", { errorfield, formData: req.body, coupon })

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
        return res.redirect("/admin/coupons")
    } catch (error) {
        console.error('Error fetching coupons:', error);
        next(error);
    }
}

const deleteCoupon = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin")

        const couponId = req.params.id

        const coupon = await Coupon.findById(couponId)

        if (!coupon)
            return res.json({ success: false, message: "Coupon not Found" })

        await Coupon.findByIdAndDelete(couponId)

        return res.json({ success: true, message: "coupon Deleted Successfully" })
    } catch (error) {
        console.error('Error fetching coupons:', error);
        next(error);
    }

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