const User = require("../../model/user");
require("dotenv").config()
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer")
const Product = require("../../model/products")
const Wishlist = require("../../model/wishlist")
const Wallet = require("../../model/wallet")
const Category = require("../../model/category")


function generateReferralCode() {
    const char = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += char.charAt(Math.floor(Math.random() * char.length));
    }
    return code;
}

const aboutPage = (req, res, next) => {
    try {
        res.render("user/about",{
        user: res.locals.user,
        username: res.locals.username,
        wishlistCount: res.locals.wishlistCount || 0,
        cartCount: res.locals.cartCount || 0
        })
    } catch (error) {
        console.error('Error fetching about page:', error);
        next(error);
    }
}

const contactUsPage = (req, res, next) => {
    try {
        res.render("user/contactUs",{
        user: res.locals.user,
        username: res.locals.username,
        wishlistCount: res.locals.wishlistCount || 0,
        cartCount: res.locals.cartCount || 0
        })
    } catch (error) {
        console.error('Error fetching about page:', error);
        next(error);
    }
}

const landingPage = async (req, res, next) => {
    try {
        const products = await Product.find({ isActive: true, isExisting: true }).sort({ updatedAt: -1 }).limit(4).populate('categoryId')
        const gamingCategory = await Category.findOne({name:'Gaming Laptop'})
        const gamingProducts = await Product.find({ isActive: true, isExisting: true,categoryId:gamingCategory._id }).sort({ updatedAt: -1 }).limit(4).populate("categoryId")

        if (req.session.user) {
            return res.redirect("/home")
        }
        const user = req.session.user
        res.render("user/landingPage", { products, user, gamingProducts, wishlistIds: null, wishlistCount: null, cartCount: null });
    } catch (error) {
        console.error('Error fetching landing page:', error);
        next(error);
    }
};

const loginPage = (req, res, next) => {
    try {
        if (req.session.user)
            return res.redirect("/home")
        res.render("user/userLogin", { error: null });
    } catch (error) {
        console.error('Error fetching login page:', error);
        next(error);
    }
};

const signupPage = (req, res, next) => {
    try {
        if (req.session.user)
            return res.redirect("/home")

        return res.render("user/userSignup", { errors: null, message: null, error: null });
    } catch (error) {
        console.error('Error fetching signup page:', error);
        next(error);
    }
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
        text: `Your verification code is: ${otp}`,
        html: `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px;">
      <h2 style="color: #4A90E2;">LapZone Email Verification</h2>
      <p>Hi there,</p>
      <p>Thank you for signing up. Please use the OTP below to verify your email address:</p>
      <div style="margin: 20px 0; padding: 12px 20px; background-color: #f5f5f5; border-left: 4px solid #4A90E2; font-size: 24px; font-weight: bold;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p style="margin-top: 30px;">Best regards,<br>LapZone Team</p>
    </div>
  `
    });
    return info.accepted.length > 0

}

const postSignUp = async (req, res, next) => {
    try {
        const { fullname, email, mobile, password, confpassword, referralCode } = req.body;

        const formData = req.body
        let refferedUser = null
        if (referralCode) {
            refferedUser = await User.findOne({ referralCode })
        }
        let refferedBy = refferedUser ? refferedUser : null

        const fields = [
            'fullname', 'email', 'mobile', 'password', 'confpassword'
        ]

        const errors = {}

        if (!fullname || fullname.trim().length === 0) {
            errors['fullname'] = "Name should not be empty";
        } else if (!/[A-Za-z0-9]/.test(fullname)) {
            errors['fullname'] = "Special characters only are not allowed";
        } else if (fullname.length < 3) {
            errors['fullname'] = "Name should be minimum 3 characters";
        } else if (!/^[A-Za-z\s]+$/.test(fullname)) {
            errors['fullname'] = "Only letters and spaces are allowed";
        }

        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            errors['email'] = "Please enter valid email"
        }

        const phoneRegex = /^[6-9]\d{9}$/;

        if (!/^\d+$/.test(mobile)) {
            errors['mobile'] = "Phone number should contain only digits";
        } else if (mobile.length !== 10) {
            errors['mobile'] = "Phone number should be 10 digits";
        } else if (!phoneRegex.test(mobile)) {
            errors['mobile'] = "Phone number must start with 6, 7, 8, or 9";
        }

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

        fields.forEach(item => {
            if (!req.body[item])
                errors[item] = `${item} is required`;
        })

        if (password !== confpassword)
            errors['confpassword'] = "passwords Missmatch";

        if (Object.keys(errors).length > 0)
            return res.render("user/userSignup", { errors, message: null, formData, error: null });

        const existingUser = await User.findOne({ $or: [{ email: email }, { mobile: mobile }] });

        if (existingUser) {
            return res.render("user/userSignup", { message: "User already exists", error: null });
        }

        const otp = generateOtp()
        const emailsend = await sendverificationEmail(email, otp)
        console.log(otp)

        if (!emailsend)
            res.json("Otp send error")

        req.session.otp = otp
        req.session.userData = { fullname:fullname.trim(), email, mobile, password, refferedBy };

        res.render("user/mailverification", { data: email });
    } catch (error) {
        console.error('Error fetching signup page:', error);
        next(error);
    }
};

const verifyOtp = async (req, res, next) => {
    try {
        const { otp } = req.body
        if (otp == req.session.otp) {
            const userdata = req.session.userData
            const hashedPassword = await bcrypt.hash(userdata.password, 10);
            const user = new User({
                fullname: userdata.fullname,
                email: userdata.email,
                mobile: userdata.mobile,
                password: hashedPassword,
                referralCode: generateReferralCode(),
                refferedBy: userdata?.refferedBy?._id || null,
            });
            await user.save();

            if (userdata.refferedBy) {
                const referrerId = userdata.refferedBy._id;

                let referrerWallet = await Wallet.findOne({ userId: referrerId });
                if (!referrerWallet) {
                    referrerWallet = new Wallet({ userId: referrerId, balance: 0 });
                }

                referrerWallet.balance += 500;
                referrerWallet.transactions.push({
                    type: 'credit',
                    amount: 100,
                    description: `Referral bonus for referring ${userdata.fullname}`
                });

                await referrerWallet.save();
            }

            let newUserWallet = await Wallet.findOne({ userId: user._id });
            if (!newUserWallet) {
                newUserWallet = new Wallet({ userId: user._id, balance: 0 });
            }

            newUserWallet.balance += 1000;
            newUserWallet.transactions.push({
                type: 'credit',
                amount: 1000,
                description: 'Welcome bonus for signing up with referral'
            });

            await newUserWallet.save();

            return res.json({
                success: true, redirecturl: "/login"
            })
        }
        return res.redirect("/")
    } catch (error) {
        console.error('Error fetching signup page:', error);
        next(error);
    }
}

const resendOtp = async (req, res, next) => {
    try {
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
    } catch (error) {
        console.error('Error fetching signup page:', error);
        next(error);
    }

}

const postLoginPage = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.render("user/userLogin", { error: "All fields are required" })

        const user = await User.findOne({ email })
        if (!user)
            return res.render("user/userLogin", { error: "User does not exist" })
        if (user.isBlocked)
            return res.render("user/userLogin", { error: "your Account is  Temporarily BLOCKED" })

        const passMatch = await bcrypt.compare(password, user.password)
        if (!passMatch)
            return res.render("user/userLogin", { error: "Invalid Credentials" })

        req.session.user = user._id
        req.session.username = user.fullname

        res.redirect("/home")

    } catch (error) {
        console.error('Error fetching signup page:', error);
        next(error);
    }

}

const homePage = async (req, res, next) => {
    try {
        if (req.session.user) {
            const user = req.session.user
            const username = req.session.username

            const products = await Product.find({ isActive: true, isExisting: true }).sort({ updatedAt: -1 }).limit(4).populate('categoryId')
            const wishlist = await Wishlist.findOne({ userId: user })
            const wishlistIds = wishlist?.items.map(item => item.productId.toString())

            const gamingCategory = await Category.findOne({name:"Gaming Laptop"})
            const gamingProducts = await Product.find({ isActive: true, isExisting: true,categoryId : gamingCategory._id }).sort({ updatedAt: -1 }).limit(4).populate("categoryId")
            return res.render("user/landingPage", { user, products, gamingProducts, username, wishlistIds })
        }
        else
            res.render("user/userLogin", { error: null, })
    } catch (error) {
        console.error('Error fetching Home page:', error);
        next(error);
    }
}

const forgotPassword = (req, res) => {

    res.render("user/verifyEmail", { error: null })

}

const verifyEmail = async (req, res, next) => {
    try {
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
    } catch (error) {
        console.error('Error fetching verifyEmail page:', error);
        next(error);
    }
}

const forgotVerifyOtp = (req, res, next) => {
    try {
        const { otp } = req.body
        if (otp == req.session.otp) {
            const userdata = req.session.userData

            return res.json({ success: true, redirecturl: "/newpassword" })
        }

        res.render("user/forgot-mail-verify", { data: req.sessionData })
    } catch (error) {
        console.error('Error fetching verifyEmail page:', error);
        next(error);
    }


}

const newPassword = (req, res) => {

    res.render("user/newpassword", { error: null })

}

const resetPassword = async (req, res, next) => {
    try {
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
    } catch (error) {
        console.error('Error fetching verifyEmail page:', error);
        next(error);
    }
}

const userLogout = (req, res, next) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log("session detroy Failed")
                return res.status(500).send("Logout failed")
            }
            res.clearCookie('connect.sid');
            res.redirect('/');
        })
    } catch (error) {
        console.error('Error fetching verifyEmail page:', error);
        next(error);
    }
}

const checkReferralCode = async (req, res, next) => {
    try {
        const { code } = req.body

        const user = await User.findOne({ referralCode: code })
        if (!user)
            return res.json({ success: false, message: "Invalid Referral Code" })
        return res.json({ success: true })
    } catch (error) {
        console.error('Error fetching verifyEmail page:', error);
        next(error);
    }

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
    userLogout,
    checkReferralCode,
    generateReferralCode,
    aboutPage,
    contactUsPage,
};
