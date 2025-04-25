const Product = require("../../model/products")


const productListing = async (req, res) => {



    const categories = await Product.aggregate([{
        $group: { _id: "$category" }
    }])


    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalProducts = await Product.countDocuments();
    const products = await Product.find().skip(skip).limit(limit);

    const totalPages = Math.ceil(totalProducts / limit);

    res.render("productListing", {
        products,
        categories,
        currentPage:page,
        totalPages,
        query: { category: req.query.category, price: req.query.price, sort: req.query.sort }
    });
}



module.exports = {
    productListing,


}