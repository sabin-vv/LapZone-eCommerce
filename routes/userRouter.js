const express = require("express")
const router = express.Router();
const passport = require("passport")
const userController = require("../controllers/user/userController")
const productController = require("../controllers/user/productController")
const validateUserStatus = require("../middlewares/userAuthCheck")
const userProfileController = require("../controllers/user/userProfileController")
const wishListController = require("../controllers/user/wishListController")
const cartController = require("../controllers/user/cartController")
const checkoutController = require("../controllers/user/checkoutController")
const orderController = require("../controllers/user/orderController")
const walletController = require("../controllers/user/walletController")
const couponController = require("../controllers/user/couponController")
const razorpayController = require("../controllers/user/razorpayController")
const referralController = require("../controllers/user/referralController")



router.get('/', userController.landingPage)
router.get("/login", userController.loginPage)
router.get('/signup', userController.signupPage)
router.post('/signup', userController.postSignUp)
router.post("/verify-otp", userController.verifyOtp)
router.post("/resend-otp", userController.resendOtp)
router.post("/signup/referral-code", userController.checkReferralCode)

router.get("/about", userController.aboutPage)
router.get("/contact-us", userController.contactUsPage)

router.get('/auth/google', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'  // Force account selection every time
}))

router.get('/auth/google/callback', passport.authenticate('google', { 
    failureRedirect: "/login",
    failureMessage: true 
}), (req, res) => {
    try {
        req.session.user = req.user._id;
        req.session.username = req.user.fullname;
        res.redirect('/home');
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect('/login');
    }
})

router.post("/login", userController.postLoginPage)
router.get("/home", validateUserStatus, userController.homePage)
router.get("/forgot-password", userController.forgotPassword)
router.post("/forgot-password", userController.verifyEmail)
router.post("/forgot-verify-otp", userController.forgotVerifyOtp)
router.get("/newpassword", userController.newPassword)
router.post("/reset-password", userController.resetPassword)
router.post("/logout", userController.userLogout)


router.get("/shop", productController.listProducts)
router.get("/shop/product/:id", productController.viewProduct)


router.get("/profile", validateUserStatus, userProfileController.profilePage)
router.post("/profile/edit-profile/:id", validateUserStatus, userProfileController.editProfile)
router.post("/profile/profile-update-verify-otp", validateUserStatus, userProfileController.otpVerify)
router.get("/profile/address", validateUserStatus, userProfileController.viewAddress)
router.post("/profile/change-password/", validateUserStatus, userProfileController.editPassword)
router.get("/profile/add-address/:id", validateUserStatus, userProfileController.newAddress)
router.post("/profile/add-address/:id", validateUserStatus, userProfileController.addAddress)
router.get("/profile/edit-address/:id", validateUserStatus, userProfileController.editAddressPage)
router.post("/profile/edit-address/:id", validateUserStatus, userProfileController.editAddress)
router.post("/profile/delete-address/:id", validateUserStatus, userProfileController.deleteAddress)
router.get("/profile/change-password", validateUserStatus, userProfileController.changePassword)
router.post("/profile/set-default-address/:id", validateUserStatus, userProfileController.setDefaultAddress)
router.get("/profile/logout", validateUserStatus, userController.userLogout)


router.post("/wishlist/toggle", validateUserStatus, wishListController.toggleWishList)
router.get("/wishlist", validateUserStatus, wishListController.viewWishlist)
router.get("/wishlist/clear-wishlist", validateUserStatus, wishListController.clearWishlist)
router.post('/wishlist/remove/:id', validateUserStatus, wishListController.removeWishlistProduct)
router.post("/wishlist/add-to-cart", validateUserStatus, wishListController.addtoCart)


router.post("/cart/add-to-cart", validateUserStatus, cartController.addtoCart)
router.get("/cart", validateUserStatus, cartController.viewCartPage)
router.post("/cart/update", validateUserStatus, cartController.cartUpdate)
router.post("/cart/remove-item/:id", validateUserStatus, cartController.removecartItem)
router.get("/cart/clear-cart", validateUserStatus, cartController.emptyCart)
router.post("/cart/add-from-shop", validateUserStatus, cartController.addfromShop)

router.post("/user/validate-stock", validateUserStatus, checkoutController.validateStock)
router.post("/user/checkout", validateUserStatus, checkoutController.proceedToCheckoutPage)
router.get("/user/checkout", checkoutController.viewCheckoutPage)
router.post("/user/order", validateUserStatus, checkoutController.orderplace)
router.post("/user/create-pending-order", validateUserStatus, checkoutController.createPendingOrder)
router.get("/user/order-page/:id", validateUserStatus, checkoutController.orderPage)
router.get("/user/order-failed", validateUserStatus, checkoutController.orderFailurePage)
router.post('/profile/checkout-page/edit-address/:id', validateUserStatus, checkoutController.editAddress)
router.post("/profile/checkout-page/add-address", validateUserStatus, checkoutController.addAddress)


router.get("/profile/order", validateUserStatus, orderController.viewOrders)
router.post("/profile/order/cancel-item", validateUserStatus, orderController.cancelitem)
router.post("/profile/order/cancel", validateUserStatus, orderController.cancelOrder)
router.get("/profile/order/invoice/:id", validateUserStatus, orderController.downloadInvoice)
router.post("/profile/order/return-item", validateUserStatus, orderController.returnProduct)
router.post("/profile/order/return", validateUserStatus, orderController.returnOrder)


router.get("/profile/wallet", validateUserStatus, walletController.viewWalletPage)
router.post("/profile/wallet/add", validateUserStatus, walletController.addMoneyToWallet)


router.post("/user/create-razorpay-order", razorpayController.createRazorpay)
router.post("/user/retry-razorpay", razorpayController.retryRazorpay)
router.post("/user/verify-payment", razorpayController.verifyPayment)
router.get("/user/order-success/:id", validateUserStatus, checkoutController.orderSuccessPage)

router.post("/profile/apply-coupon", validateUserStatus, couponController.applyCoupon)
router.get("/profile/coupon", validateUserStatus, couponController.viewCouponPage)

router.get("/profile/referral", validateUserStatus, referralController.viewReferralPage)



module.exports = router