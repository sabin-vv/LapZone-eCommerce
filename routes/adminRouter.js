const express = require("express")
const router = express.Router();
const adminController = require("../controllers/admin/adminController")
const customerController = require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")
const productController = require("../controllers/admin/productController")



router.get("/login", adminController.getadminLogin)

router.post("/login",adminController.login)

router.post("/adminlogout",adminController.adminLogout)

router.get("/",adminController.adminDashbaord)

router.get("/dashboard" ,adminController.adminDashbaord)

router.get("/customers" ,customerController.customerList )

router.get("/admindashboard",adminController.getDashboard)

router.post("/customer-block-unblock/:id",customerController.customerControll)

router.get("/category" ,categoryController.categoryListing)

router.get("/products",productController.productListing)





module.exports = router