const Product = require("../../model/products")



const addProductOffer = async (req, res) => {

    if (!req.session.admin) return res.redirect("/admin")

    const productId = req.params.id
    const { offer } = req.body

    const product = await Product.findById(productId)

    if (!product)
        return res.json({ success: false, message: "Product not Found" })

    product.offer = offer
    product.salePrice = Math.floor(product.regularPrice - (product.regularPrice * 10 / 100))
    
    await product.save()

    return res.json({ success: true, message: "Offer Added" })

}


const removeProductOffer = async (req, res) => {

    if (!req.session.admin) return res.redirect("/admin")

    const productId = req.params.id

    const product = await Product.findById(productId)

    if (!product)
        return res.json({ success: false, message: 'Product not Found' })

    product.offer = 0
    await product.save()

    return res.json({ success: true, message: "Offer Removed successfully" })


}






module.exports = {
    addProductOffer,
    removeProductOffer,
}