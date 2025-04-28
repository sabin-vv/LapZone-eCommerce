const User = require("../../model/user");
require("dotenv").config()
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer")




const landingPage = (req, res) => {

    if (req.session.user)
        return res.redirect("/")

    res.render("landingPage");
};

const loginPage = (req, res) => {
    if (req.session.user)
        return res.redirect("/home")
    res.render("userLogin", { error: null });
};

const signupPage = (req, res) => {

    if (req.session.user)
        return res.redirect("/home")

    res.render("userSignup", { message: null });
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
    const { fname, email, mobile, password, confpassword } = req.body;

    if (!fname || !email || !mobile || !password || !confpassword)
        return res.render("userSignup", { message: "all fields are required" });

    if (!/^[A-Za-z\s]+$/.test(fname))
        return res.render("userSignup", {
            message: "only letters and spaces are allowed",
        });

    if (!/(^\d+$)/.test(mobile))
        return res.render("userSignup", {
            mesage: "Phone Number should be Number",
        });
    if (mobile.length != 10)
        return res.render("userSignup", {
            message: "Phone number should be 10 digit",
        });

    if (!/(?=.*[a-z])/.test(password))
        return res.render("userSignup", {
            message: "Password should contain minimum 1 lower case letter",
        });
    if (!/(?=.*[A-Z])/.test(password))
        return res.render("userSignup", {
            message: "Password contain minimum 1 Uppercase letter",
        });
    if (!/(?=.*\d)/.test(password))
        return res.render("userSignup", {
            message: "Password contain minimum 1 Digit",
        });
    if (!/(?=.*[@$!%*?&])/.test(password))
        return res.render("userSignup", {
            message: "Password contain minimum 1 special character",
        });
    if (!/^[A-Za-z\d@$!%*?&]{8,}$/.test(password))
        return res.render("userSignup", {
            message: "Password should be minimum 8 character long",
        });

    if (password !== confpassword)
        return res.render("userSignup", { message: "passwords Missmatch" });

    const existingUser = await User.findOne({ $or: [{ email: email }, { mobile: mobile }] });
    if (existingUser) {
        return res.render("userSignup", { message: "User already exists" });
    }


    const otp = generateOtp()
    const emailsend = await sendverificationEmail(email, otp)
    console.log(otp)

    if (!emailsend)
        res.json("Otp send error")


    req.session.otp = otp
    req.session.userData = { fname, email, mobile, password }


    res.render("mailverification", { data: email });
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
        return res.render("userLogin", { error: "All fields are required" })

    const user = await User.findOne({ email })
    if (!user)
        return res.render("userLogin", { error: "Invalid Credentials" })
    if(user.isBlocked)
        return res.render("userLogin" ,{error:"your Account is  Temporarily BLOCKED"})

    const passMatch = await bcrypt.compare(password, user.password)
    if (!passMatch)
        return res.render("userLogin", { error: "Invalid Credentials" })

    req.session.user = email

    res.redirect("/home")


}



const homePage = (req, res) => {

    if (req.session.user)
        return res.render("home")
    else
        res.render("userLogin", { error: null })
}


const forgotPassword = (req, res) => {

    res.render("verifyEmail", { error: null })

}

const verifyEmail = async (req, res) => {

    const { email } = req.body

    const isuserexist = await User.findOne({ email })

    if (!isuserexist)
        return res.render("verifyEmail", { error: "This email is not Registered" })

    const otp = generateOtp()
    const emailsend = await sendverificationEmail(email, otp)

    console.log("OTP ", otp)


    if (!emailsend) {
        res.json("OTP send error")
    }

    req.session.otp = otp
    req.session.userData = { email }


    res.render("forgot-mail-verify", { data: email })
}

const forgotVerifyOtp = (req, res) => {

    const { otp } = req.body
    if (otp == req.session.otp) {
        const userdata = req.session.userData

        return res.json({ success: true, redirecturl: "/newpassword" })
    }

    res.render("forgot-mail-verify", { data: req.sessionData })


}

const newPassword = (req, res) => {

    res.render("newpassword", { error: null })

}

const resetPassword = async (req, res) => {

    const { password, confirmPassword } = req.body

    if (!password || !confirmPassword)
        return res.render("newpassword", { error: "All Fields are Required" })

    if (!/(?=.*[a-z])/.test(password))
        return res.render("newpassword", {
            error: "Password should contain minimum 1 lower case letter",
        });
    if (!/(?=.*[A-Z])/.test(password))
        return res.render("newpassword", {
            error: "Password contain minimum 1 Uppercase letter",
        });
    if (!/(?=.*\d)/.test(password))
        return res.render("newpassword", {
            error: "Password contain minimum 1 Digit",
        });
    if (!/(?=.*[@$!%*?&])/.test(password))
        return res.render("newpassword", {
            error: "Password contain minimum 1 special character",
        });
    if (!/^[A-Za-z\d@$!%*?&]{8,}$/.test(password))
        return res.render("newpassword", {
            error: "Password should be minimum 8 character long",
        });

    if (password !== confirmPassword) {
        return res.render("newpassword", { error: "Passwords Missmatch" })
    }
    const { email } = req.session.userData
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.updateOne({ email: email }, { $set: { password: hashedPassword } })
    console.log(user)

    res.redirect("/login")
}



const userLogout = (req, res) => {

    req.session.destroy(err => {
        if (err) {
            console.log("session detroy Failed")
            return res.status(500).send("Logout failed")
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    })
}



module.exports = {
    landingPage,
    loginPage,
    signupPage,
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
