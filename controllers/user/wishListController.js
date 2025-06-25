const { findOneAndDelete } = require("../../model/user")
const Wishlist = require("../../model/wishlist")
const mongoose = require("mongoose")
const Product = require("../../model/products")
const Cart = require("../../model/cart")
const User = require("../../model/user")


const toggleWishList = async (req, res, next) => {
    try {
        if (!req.session.user) return res.status(401).json({ success: false, notLoggedIn: true })
           
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
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        next(error);
    }
}

const viewWishlist = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/login")

        const user = await User.findById(req.session.user);
        const wishlist = await Wishlist.findOne({ userId: user }).populate('items.productId')


        if (wishlist)
            return res.render("user/wishListPage", { wishlist: wishlist.items, user })

        return res.render("user/wishListPage", { wishlist: null, user })
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        next(error);
    }
}

const clearWishlist = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/")

        const wishlist = await Wishlist.findOne({ userId: req.session.user })
        if (wishlist) {
            await Wishlist.deleteOne(wishlist)
        }
        res.redirect("/wishlist")
    } catch (error) {
        console.error('Error clearing wishlist:', error);
        next(error);
    }

}

const removeWishlistProduct = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/")

        const productId = req.params.id;

        const wishlist = await Wishlist.updateOne({ userId: req.session.user }, { $pull: { items: { productId: productId } } })

        res.json({ success: true, mesage: "Removed from wishlist" })
    } catch (error) {
        console.error('Error removing wishlist product:', error);
        next(error);
    }

}

const addtoCart = async (req, res, next) => {
  try {
    if (!req.session.user) return res.redirect("/");

    const { productId, variantId } = req.body;
    const userId = req.session.user;

    const product = await Product.findById(productId);
    if (!product || !product.isActive || !product.isExisting) {
      return res.status(400).json({ success: false, message: "Product not available" });
    }

    const selectedVariant = product.variants.id(variantId);
    if (!selectedVariant) {
      return res.status(400).json({ success: false, message: "Variant not found" });
    }

    if (selectedVariant.stock <= 0) {
      return res.status(400).json({ success: false, message: "Selected variant is out of stock" });
    }

    const finalPrice = product.salePrice + (selectedVariant.priceAdjustment || 0);

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [{
          productId,
          ram: selectedVariant.RAM,
          storage: selectedVariant.Storage,
          price: finalPrice,
          quantity: 1
        }]
      });
    } else {
      // Check if variant already exists in cart
      const existingItem = cart.items.find(item =>
        item.productId.toString() === productId &&
        item.ram === selectedVariant.RAM &&
        item.storage === selectedVariant.Storage
      );

      if (existingItem) {
        if (existingItem.quantity >= 5) {
          return res.status(400).json({ success: false, message: "Cart limit reached" });
        }
        if (selectedVariant.stock <= existingItem.quantity) {
          return res.status(400).json({ success: false, message: "Not enough stock" });
        }

        existingItem.quantity += 1;
      } else {
        cart.items.push({
          productId,
          ram: selectedVariant.RAM,
          storage: selectedVariant.Storage,
          price: finalPrice,
          quantity: 1
        });
      }
    }

    await cart.save();

    const wishlist = await Wishlist.findOne({ userId });
    if (wishlist) {
      wishlist.items = wishlist.items.filter(
        item => item.productId.toString() !== productId.toString()
      );
      await wishlist.save();
    }

    return res.status(200).json({ success: true, message: "Product added to cart" });

  } catch (error) {
    console.error('Error adding to cart:', error);
    next(error);
  }
};



module.exports = {
    toggleWishList,
    viewWishlist,
    clearWishlist,
    removeWishlistProduct,
    addtoCart,

}