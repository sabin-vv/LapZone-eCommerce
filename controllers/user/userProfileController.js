const User = require("../../model/user")
const Address = require("../../model/address")
const UserController = require("./userController")
const bcrypt = require("bcrypt")
const { findByIdAndUpdate } = require("../../model/order")

const profilePage = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/")

        const userId = req.session.user
        const user = await User.findById(userId)
        res.render("user/userProfile", { user, error: null, formData: null })
    } catch (error) {
        console.error('Error fetching profile page:', error);
        next(error);
    }
}

const editProfile = async (req, res, next) => {
    try {
        const userId = req.params.id || req.body.userId;
        req.session.userId = userId
        const { fullname, email, mobile } = req.body
        let formData = req.body
        formData.id = req.session.user

        const error = {}
        if (fullname.trim() === '') {
            error['name'] = "Name cannot be empty"
            return res.render("user/userProfile", { error, formData, userId })
        } else if ((!/^[A-Za-z\s]+$/.test(fullname))) {
            error['name'] = 'Only letters are allowed'
            return res.render("user/userProfile", { error, formData, userId })
        }

        const user = await User.findById(userId)
        if (email !== user.email) {
            req.session.email = email
            const otp = await UserController.generateOtp();
            console.log(otp)

            req.session.otp = otp
            if (!otp) {
            }

            const verify = await UserController.sendverificationEmail(email, otp)

            if (verify) {

                res.render("user/userProfileUpdate", { data: email, })
            }
        }

        await User.findByIdAndUpdate(req.session.user,
            { $set: { fullname, email, mobile } },
            { new: true }
        )
        return res.redirect("/profile")
    } catch (error) {
        console.error('Error fetching profile page:', error);
        next(error);
    }

}

const otpVerify = async (req, res, next) => {
    try {
        const { otp } = req.body
        console.log("userid", req.session.otp, otp)
        if (otp == req.session.otp) {

            const user = await User.findByIdAndUpdate(req.session.userId, { $set: { email: req.session.email } }, { new: true })

            return res.json({ success: true, message: "OTp verified succesfully" })
        }
        return res.json({ success: false, message: "OTP invalid" })
    } catch (error) {
        console.error('Error fetching profile page:', error);
        next(error);
    }
}

const viewAddress = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/")

        const user = await User.findById(req.session.user)
        const addresses = await Address.find({ userId: req.session.user })

        res.render("user/viewAddress", { addresses, user })
    } catch (error) {
        console.error('Error fetching profile page:', error);
        next(error);
    }
}

const newAddress = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/")

        const userId = req.params.id
        const user = await User.findById(userId)
        const username = user.fullname

        res.render("user/addAddress", { user, username, errors: null, address: null, })
    } catch (error) {
        console.error('Error fetching profile page:', error);
        next(error);
    }
}

const addAddress = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/")

        const userId = req.session.user
        const user = await User.findById(userId)

        const { fullname, mobile, addressLine, district, state, city, pincode, landmark, addressType, isdefault } = req.body

        const formFields = ['fullname', 'mobile', 'addressLine', 'district', 'state', 'city', 'pincode']

        const errors = {}

        if (!(/^[A-Za-z\s]{3,20}$/).test(fullname)) {
            errors['fullname'] = "Name contain only letters and spaces"
        }

        if (!/^\d+$/.test(mobile))
            errors['mobile'] = "Please enter valid mobile number"
        if (addressLine.trim().length < 10) {
            errors['addressLine'] = "Address Line should be minimum 10 characters"
        }
        if (/^[^a-zA-Z0-9]+$/.test(addressLine.trim())) {
            errors['addressLine'] = "Address Line contain only letters and numbers"
        }
        if (!/[A-Za-z]/.test(addressLine)) {
            errors['addressLine'] = "Address line must contain at least one letter"
        }

        if (!(/^[A-Za-z\s\-]+$/).test(state))
            errors['state'] = "State contain only Letters"

        if (!(/^[A-Za-z\s\-]+$/).test(district))
            errors['district'] = "District contain only Letters"

        if (!(/^[A-Za-z\s\-]+$/).test(city))
            errors['city'] = "City contain only Letters"

        if (pincode.length < 6)
            errors['pincode'] = " Pincode have 6 digits"

        if (!/^\d+$/.test(pincode))
            errors['pincode'] = "Please enter valid Pincode"
        if (/^0/.test(pincode))
            errors['pincode'] = "Pincode should not start with 0"

        formFields.forEach(field => {
            if (!req.body[field] || req.body[field].trim() === '') errors[field] = `${field} is Required`
        })


        if (Object.keys(errors).length > 0) {

            return res.render("user/addAddress", { errors, user, username: user.fullname, address: null })
        }
        
        if (isdefault === "true" || isdefault === true) {
            await Address.updateMany(
                { userId: userId, isdefault: true },
                { $set: { isdefault: false } }
            );
        }

        const addressData = {
            userId: userId,
            fullname: fullname,
            mobile: mobile,
            addressLine: addressLine,
            district: district,
            state: state,
            city: city,
            pincode: pincode,
            landmark: landmark || '',
            addresstype: addressType,
            isdefault: isdefault || false
        }

        const address = new Address(addressData)
        await address.save();

        return res.redirect("/profile/address")
    } catch (error) {
        console.error('Error fetching profile page:', error);
        next(error);
    }

}

const editAddressPage = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/")

        const addressId = req.params.id;
        const address = await Address.findById(addressId)
        const user = await User.findById(address.userId)
        const username = user.fullname;

        res.render("user/editAddress", { user, username, addressId, address, errors: null })
    } catch (error) {
        console.error('Error fetching profile page:', error);
        next(error);
    }

}

const editAddress = async (req, res, next) => {
    try {
        const userId = req.session.user
        const addressId = req.params.id;
        const { fullname, mobile, addressLine, district, state, city, pincode, landmark, addressType } = req.body

        const address = await Address.findById(addressId)
        const user = await User.findById(userId)

        const formFields = ['fullname', 'mobile', 'addressLine', 'district', 'state', 'city', 'pincode']

        const errors = {}

        if (!(/^[A-Za-z\s]{3,20}$/).test(fullname)) {
            errors['fullname'] = "Name contain only letters and spaces"
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        if (!/^\d+$/.test(mobile)) {
            errors['mobile'] = "Phone number should contain only digits";
        } else if (mobile.length !== 10) {
            errors['mobile'] = "Phone number should be 10 digits";
        } else if (!phoneRegex.test(mobile)) {
            errors['mobile'] = "Phone number must start with 6, 7, 8, or 9";
        }

        if (addressLine.trim().length < 10) {
            errors['addressLine'] = "Address Line should be minimum 10 characters"
        }
        if (/^[^a-zA-Z0-9]+$/.test(addressLine.trim())) {
            errors['addressLine'] = "Address Line contain only letters and numbers"
        }
        if (!/[A-Za-z]/.test(addressLine)) {
            errors['addressLine'] = "Address line must contain at least one letter"
        }

        if (!(/^[A-Za-z\s\-]+$/).test(state))
            errors['state'] = "State contain only Letters"

        if (!(/^[A-Za-z\s\-]+$/).test(district))
            errors['district'] = "District contain only Letters"

        if (!(/^[A-Za-z\s\-]+$/).test(city))
            errors['city'] = "City contain only Letters"

        if (pincode.length < 6)
            errors['pincode'] = " Pincode have 6 digits"
        if (!/^\d+$/.test(pincode))
            errors['pincode'] = "Please enter valid Pincode"
        if (/^0/.test(pincode))
            errors['pincode'] = "Pincode should not start with 0"

        formFields.forEach(field => {
            if (!req.body[field] || req.body[field].trim() === '') errors[field] = `${field} is Required`
        })


        if (Object.keys(errors).length > 0) {

            return res.render("user/editAddress", { errors, user, username: null, address })
        }
        const addressData = {
            userId: user._id,
            fullname: fullname,
            mobile: mobile,
            addressLine: addressLine,
            district: district,
            state: state,
            city: city,
            pincode: pincode,
            landmark: landmark || '',
            addresstype: addressType
        }

        await Address.findByIdAndUpdate(addressId, addressData, { new: true })

        res.redirect("/profile/address")
    } catch (error) {
        console.error('Error fetching profile page:', error);
        next(error);
    }

}

const deleteAddress = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/")

        const addressId = req.params.id;

        await Address.findByIdAndDelete(addressId)

        res.redirect("/profile/address")
    } catch (error) {
        console.error('Error fetching profile page:', error);
        next(error);
    }
}

const changePassword = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/")
        const user = await User.findById(req.session.user);

        const username = req.session.username || req.session.user.fullname

        res.render("user/userChangePassword", { user, username, errors: null })
    } catch (error) {
        console.error('Error fetching profile page:', error);
        next(error);
    }

}

const editPassword = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/")

        const { currentPassword, newPassword, confirmPassword } = req.body
        const userId = req.session.user

        const userData = await User.findById(userId)
        const user = userData.fullname
        const username = req.session.fullname || user.fullname

        const errors = {}

        const required = ['currentPassword', 'newPassword', 'confirmPassword']

        const isCurrentPassword = await bcrypt.compare(currentPassword, userData.password)
        if (!isCurrentPassword)
            errors['currentPassword'] = 'Old password Miss match'

        if (!/(?=.*[a-z])/.test(newPassword))
            errors['newPassword'] = "Password should contain minimum 1 lower case letter";
        if (!/(?=.*[A-Z])/.test(newPassword))
            errors['newPassword'] = "Password contain minimum 1 Uppercase letter";
        if (!/(?=.*\d)/.test(newPassword))
            errors['newPassword'] = "Password contain minimum 1 Digit";
        if (!/(?=.*[@$!%*?&])/.test(newPassword))
            errors['newPassword'] = "Password contain minimum 1 special character";
        if (!/^[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword))
            errors['newPassword'] = "Password should be minimum 8 character long";

        required.forEach(field => {
            if (!req.body[field] || req.body[field].trim() === '') errors[field] = `${field} is required`
        })


        if (newPassword !== confirmPassword)
            errors['newPassword'] = "password Missmatch"

        if (Object.keys(errors).length > 0)
            return res.status(400).render("user/userChangePassword", { user, username, errors })

        const hashNewPassword = await bcrypt.hash(newPassword, 10);

        await User.findByIdAndUpdate(userId, { $set: { password: hashNewPassword } }, { new: true })

        return res.redirect("/profile")
    } catch (error) {
        console.error('Error fetching profile page:', error);
        next(error);
    }
}

const setDefaultAddress = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/")

        const addressId = req.params.id
        const userId = req.session.user


        const setDefault = await Address.findByIdAndUpdate(addressId, { isdefault: true }, { new: true })

        await Address.updateMany(
            { _id: { $ne: addressId }, userId },
            { $set: { isdefault: false } }
        );

        res.redirect("/profile/address")
    } catch (error) {
        console.error('Error fetching profile page:', error);
        next(error);
    }

}

module.exports = {
    profilePage,
    editProfile,
    otpVerify,
    viewAddress,
    newAddress,
    addAddress,
    editAddressPage,
    editAddress,
    deleteAddress,
    changePassword,
    setDefaultAddress,
    editPassword,
}