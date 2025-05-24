const Wishlist = require("../../model/wishlist")
const Cart = require("../../model/cart")
const Product = require("../../model/products")
const mongoose = require("mongoose")

const viewCartPage = async (req, res) => {

    if (!req.session.user) return res.redirect("/login")

    const userId = req.session.user
    const username = userId.fullname
    const cart = await Cart.findOne({ userId }).populate('items.productId')

    if (!cart)
        return res.render("user/cartPage", { cart: null, })

    const totalPrice = cart.items.reduce((total, item) => {
        return total += (item.productId.salePrice * item.quantity)
    }, 0)

    return res.render("user/cartPage", { cart, totalPrice })


}


const addtoCart = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect("/");

        const { productId } = req.body;
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
            return res.status(200).json({ success: 'true', message: "Product added to cart" });
        }

        const existingItem = cart.items.find(item => item.productId.toString() === productId);

        if (!existingItem) {
            cart.items.push({ productId, quantity: 1 });
            await cart.save();
            return res.status(200).json({ 'success': 'true', message: "Product added to cart" });
        }

        if (existingItem.quantity >= 5)
            return res.status(400).json({ 'success': 'false', message: "Cart limit reached" });

        if (product.count <= existingItem.quantity)
            return res.status(400).json({ 'success': false, message: "Out of stock" });

        existingItem.quantity += 1;
        await cart.save();

        return res.status(200).json({ success: 'true', message: "Product quantity increased in cart" });

    } catch (error) {
        console.error("Add to Cart Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


const cartUpdate = async (req, res) => {
     try {
        const userId = req.session.user;
        const { itemId, quantity } = req.body;
        

        const cartList = await Cart.findOne({ userId }).populate('items.productId');
        

        if (!cartList) {
            return res.json({ success: false, message: "Cart not found" });
        }

        const productIndex = cartList.items.findIndex(item => item._id.toString() === itemId.toString());
        
        
        if (productIndex === -1) {
            return res.json({ success: false, message: "Product not found in cart" });
        }

        cartList.items[productIndex].quantity = quantity;

        await cartList.save();

        
        let total = 0;
        let originalTotal = 0;

        cartList.items.forEach(item => {
            const sale = item.productId.salePrice;
            const regular = item.productId.regularPrice || sale;

            total += sale * item.quantity;
            originalTotal += regular * item.quantity;
        });

        const savings = originalTotal - total;

        res.json({
            success: true,
            message: "Cart updated successfully",
            cart: {
                items: cartList.items.map(item => ({
                    _id: item._id,
                    quantity: item.quantity,
                    productId: item.productId._id
                })),
                total,
                originalTotal,
                savings
            }
        });

    } catch (error) {
        console.error("Error updating cart:", error);
        res.json({ success: false, message: "An error occurred while updating the cart" });
    }
};


const removecartItem = async (req, res) => {
    try {

        if (!req.session.user) return res.redirect("/")

        const userId = req.session.user

        const { itemId } = req.body

        const cart = await Cart.findOne({ userId: userId, });

        if (!cart)
            return res.status(404).json({ success: false, message: "cart not Found" })

        cart.items = cart.items.filter(item => item._id.toString() !== itemId.toString());
        cart.save()

        return res.json({ success: true, message: "Item removed from Cart" })

    } catch (error) {

        console.error("Remove cart item error:", error);
        res.status(500).json({ success: false, message: "Server error" });

    }


}

const emptyCart = async (req,res) =>{

     try {
        if (!req.session.user) return res.redirect("/");

        const userId = req.session.user;
        const cart = await Cart.findOne({ userId });

        if (cart) {
            await Cart.deleteOne({ _id: cart._id });
        }

        return res.redirect('/cart');
    } catch (error) {
        console.error('Error clearing cart:', error);
        return res.status(500).send("Internal Server Error");
    }
    
}


module.exports = {
    viewCartPage,
    addtoCart,
    cartUpdate,
    removecartItem,
    emptyCart,
}