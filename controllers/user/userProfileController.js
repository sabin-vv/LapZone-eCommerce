const User = require("../../model/user")
const Address = require("../../model/address")
const UserController = require("./userController")



const profilePage = async (req, res) => {

    if (!req.session.user) return res.redirect("/")

    const userId = req.session.user
    const user = await User.findById(userId)
    res.render("user/userProfile", { user, username: null })

}

const editProfile = async (req, res) => {

    const userId = req.params.id;
    req.session.userId = userId
    const { fullname, email, mobile } = req.body


    const user = await User.findById(userId)
    if (email !== user.email) {

        const otp = await UserController.generateOtp();

        req.session.otp = otp
        if (!otp) {
        }
        const verify = await UserController.sendverificationEmail(email, otp)


        if (verify) {
            res.render("user/userProfileUpdate", { data: email, })
        }
    }


}


const otpVerify = async (req, res) => {

    const { otp } = req.body

    if (otp === req.session.otp) {

        // const user = await User.findByIdAndUpdate(req.session.userId{})

    }


}


const viewAddress = async (req, res) => {

    if (!req.session.user) return res.redirect("/")

    const user = await User.findById(req.session.user)
    const addresses = await Address.find({ userId: req.session.user })

    res.render("user/viewAddress", { addresses, user, username: null })
}


const newAddress = async (req, res) => {

    if (!req.session.user) return res.redirect("/")

    const userId = req.params.id
    const user = await User.findById(userId)
    const username = user.fullname

    res.render("user/addAddress", { user, username, errors: null, address: null, heading: "Add New Address", button: "Add Address" })

}


const addAddress = async (req, res) => {

    const heading = req.body.heading
    const button = req.body.button


    const addressDatas = { ...req.body }
    const { fullname, mobile, addressLine, district, state, city, pincode, landmark } = req.body

    const formFields = ['fullname', 'mobile', 'addressLine', 'district', 'state', 'city', 'pincode']

    const errors = {}
    formFields.forEach(field => {
        if (!req.body[field]) errors[field] = `${field} is Required`
    })

    if (!(/^[A-Za-z\s]{3,20}$/).test(fullname)) {
        errors['fullname'] = "Name contain only letters ans spaces"
    }
    if (!/^\d+$/.test(mobile))
        errors['mobile'] = "Please enter valid mobile number"

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

    if (button === 'Add Address') {
        const userId = req.params.id
        const user = await User.findById(userId)

        if (Object.keys(errors).length > 0)
            return res.render("user/addAddress", { errors, user, username: null, address: addressDatas,addressId:null, heading, button })

        const addressData = {
            userId: userId,
            fullname: fullname,
            mobile: mobile,
            addressLine: addressLine,
            district: district,
            state: state,
            city: city,
            pincode: pincode,
            landmark: landmark || ''
        }

        const address = new Address(addressData)
        await address.save();

        return res.redirect("/profile/address")
    } else {
        const addressId = req.params.id;
        const address = await Address.findById(addressId)

        const user = await User.findById(address.userId)
        if (!address)
            return res.redirect("/profile/address")

        if (Object.keys(errors).length > 0)
            return res.render("user/addAddress", { errors, user, username: null, address: addressDatas, heading, button })

        const addressData = {
            userId: user._id,
            fullname: fullname,
            mobile: mobile,
            addressLine: addressLine,
            district: district,
            state: state,
            city: city,
            pincode: pincode,
            landmark: landmark || ''
        }

        await Address.findByIdAndUpdate(addressId, addressData, { new: true })
        
        res.redirect("/profile/address")

    }

}


const editAddress = async (req, res) => {

    if (!req.session.user) return res.redirect("/")

    const addressId = req.params.id;
    const address = await Address.findById(addressId)
    const user = await User.findById(address.userId)
    const username = user.fullname;

    res.render("user/addAddress", { user, username, addressId, errors: null, address, heading: "Edit Address", button: "Update Address" })


}


const deleteAddress = async (req, res) => {


    if (!req.session.user) return res.redirect("/")

    const addressId = req.params.id;
    await Address.findByIdAndDelete(addressId)

    res.redirect("/profile/address")
}



module.exports = {
    profilePage,
    editProfile,
    otpVerify,
    viewAddress,
    newAddress,
    addAddress,
    editAddress,
    deleteAddress

}