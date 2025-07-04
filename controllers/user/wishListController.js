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
      const updatedWishlist = await Wishlist.findOne({ userId })
      const count = updatedWishlist ? updatedWishlist.items.length : 0
      
      return res.json({ success: true, action: "removed" , count })
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
    const updatedWishlist = await Wishlist.findOne({ userId })
    const count = updatedWishlist ? updatedWishlist.items.length : 0
    

    return res.json({ success: true, action: "added", count })
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    next(error);
  }
}

const viewWishlist = async (req, res, next) => {
  try {
    if (!req.session.user) return res.redirect("/login")

    const user = await User.findById(req.session.user);
    const wishlist = await Wishlist.findOne({ userId: user }).populate({
      path: 'items.productId',
      populate: {
        path: 'categoryId',
        select: 'name offer'
      }
    })

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

    const product = await Product.findById(productId).populate('categoryId');
    if (!product || !product.isActive || !product.isExisting) {
      return res.status(400).json({ success: false, message: "Product not available" });
    }

    let selectedVariant = null;
    let basePrice = product.salePrice;

    if (variantId && product.variants && product.variants.length > 0) {
      selectedVariant = product.variants.id(variantId);
      if (!selectedVariant) {
        return res.status(400).json({ success: false, message: "Variant not found" });
      }

      if (selectedVariant.stock <= 0) {
        return res.status(400).json({ success: false, message: "Selected variant is out of stock" });
      }

      basePrice = product.salePrice + (selectedVariant.priceAdjustment || 0);
    }

    const productOffer = product.offer || 0;
    const categoryOffer = product.categoryId?.offer || 0;
    const maxOffer = Math.max(productOffer, categoryOffer);
    
    const finalPrice = Math.round(basePrice * (1 - maxOffer / 100));

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      const cartItem = {
        productId,
        price: finalPrice,
        quantity: 1
      };

      if (selectedVariant) {
        cartItem.ram = selectedVariant.RAM;
        cartItem.storage = selectedVariant.Storage;
      }

      cart = new Cart({
        userId,
        items: [cartItem]
      });
    } else {
      const existingItem = cart.items.find(item => {
        if (item.productId.toString() !== productId) return false;
        
        if (selectedVariant) {
          return item.ram === selectedVariant.RAM && item.storage === selectedVariant.Storage;
        }
        
        return !item.ram && !item.storage;
      });

      if (existingItem) {
        if (existingItem.quantity >= 5) {
          return res.status(400).json({ success: false, message: "Cart limit reached" });
        }
        
        if (selectedVariant && selectedVariant.stock <= existingItem.quantity) {
          return res.status(400).json({ success: false, message: "Not enough stock" });
        }

        existingItem.quantity += 1;
      } else {
        const cartItem = {
          productId,
          price: finalPrice,
          quantity: 1
        };

        if (selectedVariant) {
          cartItem.ram = selectedVariant.RAM;
          cartItem.storage = selectedVariant.Storage;
        }

        cart.items.push(cartItem);
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