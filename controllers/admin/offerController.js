const Product = require("../../model/products")
const Category = require("../../model/category")


const addProductOffer = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin")

        const productId = req.params.id
        const { offer } = req.body

        const product = await Product.findById(productId).populate('categoryId')

        if (!product)
            return res.json({ success: false, message: "Product not Found" })

        product.offer = offer
        const offerPrice = product.offer || product.categoryId?.offer || 0;
        if (offerPrice > 0) {
            product.salePrice = Math.floor(product.regularPrice - (product.regularPrice * offerPrice / 100));
        } else {
            product.salePrice = product.regularPrice;
        }

        await product.save()

        return res.json({ success: true, message: "Offer Added" })
    } catch (error) {
        console.error('Error fetching categories:', error);
        next(error);
    }

}

const removeProductOffer = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin")

        const productId = req.params.id

        const product = await Product.findById(productId).populate('categoryId')

        if (!product)
            return res.json({ success: false, message: 'Product not Found' })

        product.offer = 0
        if (product.categoryId && product.categoryId.offer > 0) {
            product.salePrice = Math.floor(product.regularPrice - (product.regularPrice * product.categoryId.offer / 100));
        } else {
            product.salePrice = product.regularPrice;
        }

        await product.save()

        return res.json({ success: true, message: "Offer Removed successfully" })
    } catch (error) {
        console.error('Error fetching categories:', error);
        next(error);
    }

}

const addCategoryOffer = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin")

        const categoryId = req.params.id
        const { offer } = req.body
        const category = await Category.findById(categoryId)

        if (!category)
            return res.json({ success: false, message: "Category not Found" })

        category.offer = offer

        const products = await Product.find({ categoryId });

        for (const product of products) {
            const productOffer = product.offer || 0;
            const finalOffer = Math.max(productOffer, offer || 0);

            product.salePrice = Math.floor(
                product.regularPrice - (product.regularPrice * finalOffer / 100)
            );

            await category.save()

            return res.json({ success: true, message: "Offer added SuccessFully" })
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
        next(error);
    }
}

const removeCategoryOffer = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin")

        const categoryId = req.params.id

        const category = await Category.findById(categoryId)
        if (!category)
            return res.json({ success: false, message: "Category Not Found" })

        category.offer = 0
        await category.save()

        return res.json({ success: true, message: "Offer Removed Successfully" })
    } catch (error) {
        console.error('Error fetching categories:', error);
        next(error);
    }
}


module.exports = {
    addProductOffer,
    removeProductOffer,
    addCategoryOffer,
    removeCategoryOffer,
}