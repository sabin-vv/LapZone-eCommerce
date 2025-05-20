const { findOneAndDelete } = require("../../model/user")
const Wishlist = require("../../model/wishlist")
const mongoose = require("mongoose")
const Product = require("../../model/products")
const Cart = require("../../model/cart")



const toggleWishList = async (req, res) => {

    if (!req.session.user) return res.json({ success: false })

    const { productId } = req.body

    const userId = req.session.user

    const existing = await Wishlist.findOne({ userId: userId, 'items.productId': productId })

    if (existing) {
        await Wishlist.updateOne(
            { userId, 'items.productId': productId },
            { $pull: { items: { productId } } }
        )
        return res.json({ success: true, action: "removed" })
    }

    const wishlistExist = await Wishlist.findOne({ userId: userId })

    if (wishlistExist) {

        wishlistExist.items.push({ productId })
        await wishlistExist.save()

    } else {
        const wishlist = new Wishlist({
            userId: userId,
            items: [{ productId: productId }]
        })

        await wishlist.save()
    }

    return res.json({ success: true, action: "added" })

}


const viewWishlist = async (req, res) => {

    if (!req.session.user) return res.redirect("/login")

    const user = req.session.user;
    const wishlist = await Wishlist.findOne({ userId: user }).populate('items.productId')


    if (wishlist)
        return res.render("user/wishListPage", { wishlist: wishlist.items, })

    return res.render("user/wishListPage", { wishlist: null, })
}

const clearWishlist = async (req, res) => {

    if (!req.session.user) return res.redirect("/")

    const wishlist = await Wishlist.findOne({ userId: req.session.user })
    if (wishlist) {
        await Wishlist.deleteOne(wishlist)
    }
    res.redirect("/wishlist")

}
const removeWishlistProduct = async (req, res) => {

    if (!req.session.user) return res.redirect("/")

    const productId = req.params.id;
    console.log(productId);


    const wishlist = await Wishlist.updateOne({ userId: req.session.user }, { $pull: { items: { productId: productId } } })

    res.json({ success: true, mesage: "Removed from wishlist" })

}


const addtoCart = async (req, res) => {

    if (!req.session.user) return res.redirect("/")

    const { productId } = req.body
    const userId = req.session.user;

    const product = await Product.findById(productId);
    if (!product || !product.isActive || !product.isExisting)
        return res.json({ success: false });

    if (product.count === 0)
        return res.json({ success: false, message: "Out of stock" });

    let cart = await Cart.findOne({ userId });
    
    if (!cart) {
        cart = new Cart({
            userId,
            items: [{ productId, quantity: 1 }],
        });
        await cart.save();
        const wishlist = await Wishlist.findOne({ userId });
        wishlist.items = await wishlist.items.filter(item => item.productId.toString() !== productId.toString())
        await wishlist.save()
        return res.status(200).json({ success: 'true', message: "Product added to cart" });
    }

    const existingItem = cart.items.find(item => item.productId.toString() === productId);

    if (!existingItem) {
        cart.items.push({ productId, quantity: 1 });
        await cart.save();
        const wishlist = await Wishlist.findOne({ userId });
        wishlist.items = await wishlist.items.filter(item => item.productId.toString() !== productId.toString())
        await wishlist.save()

        return res.status(200).json({ 'success': 'true', message: "Product added to cart" });
    }

    if (existingItem.quantity >= 5)
        return res.status(400).json({ 'success': 'false', message: "Cart limit reached" });

    if (product.count <= existingItem.quantity)
        return res.status(400).json({ 'success': false, message: "Out of stock" });

    existingItem.quantity += 1;
    await cart.save();
    const wishlist = await Wishlist.findOne({ userId: req.session.user })
    wishlist.items = await wishlist.items.filter(item => item.productId.toString() !== productId.toString())
    await wishlist.save()

    return res.status(200).json({ success: 'true', message: "Product quantity increased in cart" });

}

module.exports = {
    toggleWishList,
    viewWishlist,
    clearWishlist,
    removeWishlistProduct,
    addtoCart,

}