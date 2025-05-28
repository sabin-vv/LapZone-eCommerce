const express = require("express")
const router = express.Router();
const passport = require("passport")
const userController = require("../controllers/user/userController")
const productController = require("../controllers/user/productController")
const isUserBlocked = require("../middlewares/userAuthCheck")
const userProfileController = require("../controllers/user/userProfileController")
const wishListController = require("../controllers/user/wishListController")
const cartController = require ("../controllers/user/cartController.js")
const checkoutController = require('../controllers/user/checkoutController')
const OrderController = require("../controllers/user/orderController.js")
const walletController = require("../controllers/user/walletController.js")
const couponController = require('../controllers/user/couponController.js')
const razorpayController = require("../controllers/user/razorpayController.js")


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
router.post("/logout", userController.userLogout)



router.get("/shop", isUserBlocked, productController.listProducts)
router.get("/shop/product/:id", isUserBlocked, productController.viewProduct)


router.get("/profile", userProfileController.profilePage)
router.post("/profile/edit-profile/:id", userProfileController.editProfile)
router.post("/profile/profile-update-verify-otp", userProfileController.otpVerify)
router.get("/profile/address", userProfileController.viewAddress)
router.post("/profile/change-password/", userProfileController.editPassword)
router.get("/profile/add-address/:id", userProfileController.newAddress)
router.post("/profile/add-address/:id", userProfileController.addAddress)
router.get("/profile/edit-address/:id", userProfileController.editAddressPage)
router.post("/profile/edit-address/:id",userProfileController.editAddress)
router.post("/profile/delete-address/:id",userProfileController.deleteAddress)
router.get("/profile/change-password",userProfileController.changePassword)
router.post("/profile/set-default-address/:id",userProfileController.setDefaultAddress)


router.post("/wishlist/toggle",wishListController.toggleWishList)
router.get("/wishlist",wishListController.viewWishlist)
router.get("/wishlist/clear-wishlist",wishListController.clearWishlist)
router.post('/wishlist/remove/:id' ,wishListController.removeWishlistProduct)
router.post("/wishlist/add-to-cart",wishListController.addtoCart)

router.post("/cart/add-to-cart", cartController.addtoCart)
router.get("/cart",cartController.viewCartPage)
router.post("/cart/update",cartController.cartUpdate)
router.post("/cart/remove-item/:id",cartController.removecartItem)
router.get("/cart/clear-cart" ,cartController.emptyCart)

router.get("/user/checkout",checkoutController.checkoutPage)
router.post("/user/order",checkoutController.orderplace)
router.get("/user/order-page/:id",checkoutController.orderPage)
router.get("/user/order-failed",checkoutController.orderFailurePafe)

router.get("/profile/order",OrderController.viewOrders)
router.post("/profile/order/cancel-item",OrderController.cancelitem)
router.post("/profile/order/cancel",OrderController.cancelProduct)
router.get("/profile/order/invoice/:id" ,OrderController.downloadInvoice)
router.post("/profile/order/return-item",OrderController.returnProduct)

router.get("/profile/wallet" ,walletController.viewWalletPage)
router.post ("/profile/wallet/add",walletController.addMoneyToWallet)

router.post("/user/create-razorpay-order",razorpayController.createRazoroay)


router.post("/profile/apply-coupon",couponController.applyCoupon)

module.exports = router