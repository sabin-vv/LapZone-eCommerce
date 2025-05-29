const User = require("../../model/user");
require("dotenv").config()
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer")
const Product = require("../../model/products")
const Wishlist = require("../../model/wishlist")



const landingPage = async (req, res) => {

    const products = await Product.find({ isActive: true, isExisting: true }).sort({ updatedAt: -1 }).limit(4).populate('categoryId')
    const gamingProducts = await Product.find({ isActive: true, isExisting: true, category: "Gaming Laptop" }).sort({ updatedAt: -1 }).limit(4).populate("categoryId")


    if (req.session.user) {
        return res.redirect("/home")
    }


    const user = req.session.user
    res.render("user/landingPage", { products, user, gamingProducts, wishlistIds: null });
};

const loginPage = (req, res) => {
    if (req.session.user)
        return res.redirect("/home")
    res.render("user/userLogin", { error: null });
};

const signupPage = (req, res) => {

    if (req.session.user)
        return res.redirect("/home")

    return res.render("user/userSignup", { errors: null ,message :null});
};


function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000)
}

async function sendverificationEmail(email, otp) {

    const transporter = nodemailer.createTransport({
        service: "gmail",
        port: 587,
        secure: false,
        auth: {
            user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_PASSWORD
        }
    })

    const info = await transporter.sendMail({
        from: process.env.NODEMAILER_EMAIL,
        to: email,
        subject: "OTP verification",
        text: `Verification Code ${otp}`
    })
    return info.accepted.length > 0

}

const postSignUp = async (req, res) => {
    const { fullname, email, mobile, password, confpassword } = req.body;

    const fields = [
        'fullname', 'email', 'mobile', 'password', 'confpassword'
    ]

    const errors = {}

    fields.forEach(item => {
        if (!req.body[item])
            errors[item] = `${item} is required`;
    })


    if (!/^[A-Za-z\s]+$/.test(fullname))
        errors['fullname'] = "only letters and spaces are allowed"

    if (!/(^\d+$)/.test(mobile))
        errors['mobile'] = "Phone Number should be Number";

    if (mobile.length != 10)
        errors['mobile'] = "Phone number should be 10 digit";

    if (!/(?=.*[a-z])/.test(password))
        errors['password'] = "Password should contain minimum 1 lower case letter";
    if (!/(?=.*[A-Z])/.test(password))
        errors['password'] = "Password contain minimum 1 Uppercase letter";
    if (!/(?=.*\d)/.test(password))
        errors['password'] = "Password contain minimum 1 Digit";
    if (!/(?=.*[@$!%*?&])/.test(password))
        errors['password'] = "Password contain minimum 1 special character";
    if (!/^[A-Za-z\d@$!%*?&]{8,}$/.test(password))
        errors['password'] = "Password should be minimum 8 character long";

    

    if (password !== confpassword)
        errors['confpassword'] = "passwords Missmatch";

    if (Object.keys(errors > 0))
        return res.render("user/userSignup", { errors, message: null });

    const existingUser = await User.findOne({ $or: [{ email: email }, { mobile: mobile }] });
    if (existingUser) {
        
        return res.render("user/userSignup", { message: "User already exists" });
    }

    const otp = generateOtp()
    const emailsend = await sendverificationEmail(email, otp)
    console.log(otp)

    if (!emailsend)
        res.json("Otp send error")


    req.session.otp = otp
    req.session.userData = { fname, email, mobile, password }


    res.render("user/mailverification", { data: email });
};


const verifyOtp = async (req, res) => {

    const { otp } = req.body
    if (otp == req.session.otp) {
        const userdata = req.session.userData
        const hashedPassword = await bcrypt.hash(userdata.password, 10);
        const user = new User({
            fullname: userdata.fname,
            email: userdata.email,
            mobile: userdata.mobile,
            password: hashedPassword,
        });
        await user.save();

        return res.json({
            success: true, redirecturl: "/login"
        })
    }
    return res.redirect("/")
}


const resendOtp = async (req, res) => {


    const { email } = req.session.userData
    if (!email)
        return res.status(400).json({ success: false, message: "OTP send failed" })
    else {
        const otp = generateOtp();
        req.session.otp = otp;
        const emailsend = await sendverificationEmail(email, otp)
        if (emailsend) {
            console.log("OTP resend : ", otp)
            res.status(200).json({ success: true, message: "OTP Resend Successfully" })
        }
    }


}


const postLoginPage = async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password)
        return res.render("user/userLogin", { error: "All fields are required" })

    const user = await User.findOne({ email })
    if (!user)
        return res.render("user/userLogin", { error: "Invalid Credentials" })
    if (user.isBlocked)
        return res.render("user/userLogin", { error: "your Account is  Temporarily BLOCKED" })

    const passMatch = await bcrypt.compare(password, user.password)
    if (!passMatch)
        return res.render("user/userLogin", { error: "Invalid Credentials" })

    req.session.user = user._id
    req.session.username = user.fullname


    res.redirect("/home")


}


const homePage = async (req, res) => {

    if (req.session.user) {
        const user = req.session.user
        const username = req.session.username

        const products = await Product.find({ isActive: true, isExisting: true }).sort({ updatedAt: -1 }).limit(4).populate('categoryId')
        const wishlist = await Wishlist.findOne({ userId: user })
        const wishlistIds = wishlist?.items.map(item => item.productId.toString())

        const gamingProducts = await Product.find({ isActive: true, isExisting: true, category: "Gaming Laptop" }).sort({ updatedAt: -1 }).limit(4).populate("categoryId")
        return res.render("user/landingPage", { user, products, gamingProducts, username, wishlistIds })
    }
    else
        res.render("user/userLogin", { error: null, })
}


const forgotPassword = (req, res) => {

    res.render("user/verifyEmail", { error: null })

}

const verifyEmail = async (req, res) => {

    const { email } = req.body

    const isuserexist = await User.findOne({ email })

    if (!isuserexist)
        return res.render("user/verifyEmail", { error: "This email is not Registered" })

    const otp = generateOtp()
    const emailsend = await sendverificationEmail(email, otp)

    console.log("OTP ", otp)


    if (!emailsend) {
        res.json("OTP send error")
    }

    req.session.otp = otp
    req.session.userData = { email }


    res.render("user/forgot-mail-verify", { data: email })
}

const forgotVerifyOtp = (req, res) => {

    const { otp } = req.body
    if (otp == req.session.otp) {
        const userdata = req.session.userData

        return res.json({ success: true, redirecturl: "/newpassword" })
    }

    res.render("user/forgot-mail-verify", { data: req.sessionData })


}

const newPassword = (req, res) => {

    res.render("user/newpassword", { error: null })

}

const resetPassword = async (req, res) => {

    const { password, confirmPassword } = req.body

    if (!password || !confirmPassword)
        return res.render("user/newpassword", { error: "All Fields are Required" })

    if (!/(?=.*[a-z])/.test(password))
        return res.render("user/newpassword", {
            error: "Password should contain minimum 1 lower case letter",
        });
    if (!/(?=.*[A-Z])/.test(password))
        return res.render("user/newpassword", {
            error: "Password contain minimum 1 Uppercase letter",
        });
    if (!/(?=.*\d)/.test(password))
        return res.render("user/newpassword", {
            error: "Password contain minimum 1 Digit",
        });
    if (!/(?=.*[@$!%*?&])/.test(password))
        return res.render("user/newpassword", {
            error: "Password contain minimum 1 special character",
        });
    if (!/^[A-Za-z\d@$!%*?&]{8,}$/.test(password))
        return res.render("user/newpassword", {
            error: "Password should be minimum 8 character long",
        });

    if (password !== confirmPassword) {
        return res.render("user/newpassword", { error: "Passwords Missmatch" })
    }
    const { email } = req.session.userData
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.updateOne({ email: email }, { $set: { password: hashedPassword } })


    res.redirect("/login")
}

const userLogout = (req, res) => {

    req.session.destroy(err => {
        if (err) {
            console.log("session detroy Failed")
            return res.status(500).send("Logout failed")
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    })
}



module.exports = {
    landingPage,
    loginPage,
    signupPage,
    generateOtp,
    sendverificationEmail,
    postSignUp,
    verifyOtp,
    resendOtp,
    postLoginPage,
    homePage,
    forgotPassword,
    verifyEmail,
    forgotVerifyOtp,
    newPassword,
    resetPassword,
    userLogout
};
