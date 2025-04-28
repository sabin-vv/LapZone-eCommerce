const Product = require("../../model/products")


const categoryListing = async (req, res) => {

    if (!req.session.admin)
        return res.redirect("/admin/login")

    const category = await Product.aggregate([{
        $group: { _id: "$category", count: { $sum: 1 } }
    }, {
        $sort: {
            _id: 1
        }
    }])


    res.render("categoryListing", { category })
}




module.exports = {
    categoryListing,

}