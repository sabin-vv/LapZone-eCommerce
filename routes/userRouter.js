const express = require("express")
const router = express.Router();
const passport = require("passport")
const userController = require("../controllers/user/userController")
const productController = require("../controllers/user/productController")
const isUserBlocked = require("../middlewares/userAuthCheck")
const userProfileController = require("../controllers/user/userProfileController")

router.get('/', userController.landingPage)
router.get("/login", userController.loginPage)
router.get('/signup', userController.signupPage)
router.post('/signup', userController.postSignUp)
router.post("/verify-otp", userController.verifyOtp)
router.post("/resend-otp", userController.resendOtp)




router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: "/login" }), (req, res) => {
    req.session.user = req.user;
    res.redirect('/home')
})



router.post("/login", userController.postLoginPage)
router.get("/home", isUserBlocked, userController.homePage)
router.get("/forgot-password", userController.forgotPassword)
router.post("/forgot-password", userController.verifyEmail)
router.post("/forgot-verify-otp", userController.forgotVerifyOtp)
router.get("/newpassword", userController.newPassword)
router.post("/reset-password", userController.resetPassword)
router.get("/logout", userController.userLogout)



router.get("/shop", isUserBlocked, productController.listProducts)
router.get("/shop/product/:id", isUserBlocked, productController.viewProduct)


router.get("/profile", userProfileController.profilePage)
router.post("/profile/edit-profile/:id", userProfileController.editProfile)
router.post("/profile/profile-update-verify-otp", userProfileController.otpVerify)
router.get("/profile/address", userProfileController.viewAddress)
router.get("/profile/add-address/:id", userProfileController.newAddress)
router.post("/profile/add-address/:id", userProfileController.addAddress)
router.get("/profile/edit-address/:id", userProfileController.editAddress)
router.post("/profile/delete-address/:id",userProfileController.deleteAddress)



module.exports = router