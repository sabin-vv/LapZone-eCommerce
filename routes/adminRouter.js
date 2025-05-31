const express = require("express")
const router = express.Router();
const adminController = require("../controllers/admin/adminController")
const customerController = require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")
const productController = require("../controllers/admin/productController")
const upload = require("../middlewares/multer")
const orderController = require("../controllers/admin/orderController");
const offerController = require("../controllers/admin/offerController")
const couponController  = require("../controllers/admin/couponController")
const salesController = require("../controllers/admin/salesController")


router.get("/login", adminController.getadminLogin)
router.post("/login", adminController.login)
router.post("/adminlogout", adminController.adminLogout)
router.get("/", adminController.adminDashbaord)
router.get("/dashboard", adminController.adminDashbaord)
router.get("/admindashboard", adminController.getDashboard)


router.get("/customers", customerController.customerList)
router.post("/customer-block-unblock/:id", customerController.customerControll)


router.get("/category", categoryController.categoryListing)
router.post("/category-list-unlist/:id", categoryController.categoryListUnlist)
router.get("/category/add", categoryController.addCategory)
router.post("/add-category", categoryController.newCategory)
router.get("/category/edit/:id", categoryController.editCategory)
router.post("/update-category/:id", categoryController.updateCategory)
router.post("/category/delete/:id", categoryController.softdeleteCategory)


router.get("/products", productController.productListing)
router.get("/product/add", productController.newProduct)
router.get("/product/edit/:id", productController.editProduct)
router.post("/product/add",
    upload.fields([
        { name: 'images[0].file', maxCount: 1 },
        { name: 'images[1].file', maxCount: 1 },
        { name: 'images[2].file', maxCount: 1 },
        { name: 'images[3].file', maxCount: 1 },
        { name: 'images[4].file', maxCount: 1 }
    ]),
    productController.addProduct)
router.put("/products/:id", upload.fields([
    { name: 'images[0].file', maxCount: 1 },
    { name: 'images[1].file', maxCount: 1 },
    { name: 'images[2].file', maxCount: 1 },
    { name: 'images[3].file', maxCount: 1 },
    { name: 'images[4].file', maxCount: 1 }
]), productController.updateProduct);

router.post("/product-toggle/:id", productController.toggleProduct)
router.post("/product/delete/:id", productController.softDelete)

router.get("/orders", orderController.listOrders)
router.post("/update-order-status", orderController.updateOrderStatus)
router.get("/view-order/:id", orderController.viewOrder)
router.post("/orders/item/:id/update-status", orderController.updateItemStatus)
router.get("/orders/cancel-return-request", orderController.cancelReturnRequest)
router.post('/return-request/approve', orderController.returnApprove)
router.post('/return-request/reject', orderController.returnReject)
router.post('/cancel-request/approve', orderController.cancelApprove)
router.post('/cancel-request/reject', orderController.cancelReject)

router.post("/product/add-offer/:id", offerController.addProductOffer)
router.post("/product/remove-offer/:id", offerController.removeProductOffer)
router.post("/category/add-offer/:id", offerController.addCategoryOffer)
router.post("/category/remove-offer/:id", offerController.removeCategoryOffer)

router.get("/coupon",couponController.viewCouponPage)
router.get("/coupons/add",couponController.newCoupon)
router.post ("/coupons/add" ,couponController.addCoupon)
router.post("/coupons/toggle-status", couponController.couponStatusChange)
router.get("/coupons/edit/:id",couponController.editCoupon)
router.post("/coupons/edit/:id" ,couponController.updateCoupon)
router.post("/coupons/delete/:id",couponController.deleteCoupon)

router.get("/sales-report",salesController.salesReportPage)
router.get('/sales-report-data', salesController.getSalesReportData);

module.exports = router