const Wishlist = require("../../model/wishlist")
const Cart = require("../../model/cart")
const Product = require("../../model/products")
const mongoose = require("mongoose")

const viewCartPage = async (req, res, next) => {
  try {
    if (!req.session.user) return res.redirect("/login")

    const userId = req.session.user
    const cart = await Cart.findOne({ userId }).populate('items.productId')

    if (!cart)
      return res.render("user/cartPage", { cart: null, })

    const totalPrice = cart.items.reduce((total, item) => {
      const itemPrice = item.price || item.productId.salePrice
      return total += (itemPrice * item.quantity)
    }, 0)

    return res.render("user/cartPage", { cart, totalPrice })
  } catch (error) {
    console.error('Error fetching cart:', error);
    next(error);
  }


}

const addtoCart = async (req, res, next) => {
  try {
    if (!req.session.user) return res.redirect("/");

    const { productId, ram, storage } = req.body;
    const userId = req.session.user;

    const product = await Product.findById(productId).populate('categoryId');
    if (!product || !product.isActive || !product.isExisting) {
      return res.status(400).json({ success: false, message: "Product not available" });
    }

    const selectedVariant = product.variants.find(
      v => v.RAM === ram && v.Storage === storage
    );

    if (!selectedVariant) {
      return res.status(400).json({ success: false, message: "Selected variant not found" });
    }

    if (selectedVariant.stock <= 0) {
      return res.status(400).json({ success: false, message: "Selected variant is out of stock" });
    }

    const basePrice = product.salePrice + (selectedVariant.priceAdjustment || 0);
    const productOffer = product.offer || 0;
    const categoryOffer = product.categoryId?.offer || 0;
    const maxOffer = Math.max(productOffer, categoryOffer);
    const finalPrice = Math.round(basePrice * (1 - maxOffer / 100));

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [{
          productId,
          ram,
          storage,
          price: finalPrice,
          quantity: 1
        }]
      });
    } else {
      const existingItem = cart.items.find(item =>
        item.productId.toString() === productId &&
        item.ram === ram &&
        item.storage === storage
      );

      if (existingItem) {
        if (existingItem.quantity >= 5) {
          return res.status(400).json({ success: false, message: "Cart limit reached" });
        }

        if (selectedVariant.stock <= existingItem.quantity) {
          return res.status(400).json({ success: false, message: "Not enough stock available" });
        }

        existingItem.quantity += 1;
      } else {
        cart.items.push({
          productId,
          ram,
          storage,
          price: finalPrice,
          quantity: 1
        });
      }
    }

    await cart.save();
    const updatedcartCount = await Cart.findOne({ userId });
    const count = updatedcartCount ? updatedcartCount.items.length : 0

    return res.status(200).json({ success: true, message: "Product added to cart", count });

  } catch (error) {
    console.error("Error adding to cart:", error);
    next(error);
  }
};

const cartUpdate = async (req, res, next) => {
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

    const cartItem = cartList.items[productIndex];
    const product = cartItem.productId;
    const variant = product.variants.find(v => v.RAM === cartItem.ram && v.Storage === cartItem.storage);

    if (quantity > variant.stock && quantity > cartItem.quantity) {
      return res.json({ success: false, message: `Only ${variant.stock} units available` });
    }

    cartList.items[productIndex].quantity = quantity;

    await cartList.save();


    let total = 0;
    let originalTotal = 0;

    cartList.items.forEach(item => {
      const dynamicPrice = item.price || item.productId.salePrice;
      const regular = item.productId.regularPrice || dynamicPrice;

      total += dynamicPrice * item.quantity;
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
          productId: item.productId._id,
          price: item.price,
          ram: item.ram,
          storage: item.storage,

        })),
        total,
        originalTotal,
        savings
      }
    });

  } catch (error) {
    console.error('Error updating cart:', error);
    next(error);
  }
};

const removecartItem = async (req, res, next) => {
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
    console.error('Error removing cart item:', error);
    next(error);
  }
}

const emptyCart = async (req, res, next) => {
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
    next(error);
  }

}

const addfromShop = async (req, res, next) => {
  try {
    if (!req.session.user) return res.status(401).json({ success: false, message: "Unauthorized", redirectTo: "/login" });

    const userId = req.session.user
    const { productId } = req.body
    const product = await Product.findById(productId).populate('categoryId');

    if (!product || !product.isActive || !product.isExisting)
      return res.json({ success: false, message: "Product not available" });

    const variant = product.variants.find(v => v.stock > 0)
    if (!variant)
      return res.json({ success: false, message: "No stock available" });

    const productOffer = product.offer || 0;
    const categoryOffer = product.categoryId?.offer || 0;
    const maxOffer = Math.max(productOffer, categoryOffer)
    const basePrice = product.salePrice + (variant.priceAdjustment || 0);
    const finalPrice = Math.round(basePrice * (1 - maxOffer / 100));

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({
        userId,
        items: [{
          productId,
          ram: variant.RAM,
          storage: variant.Storage,
          price: finalPrice,
          quantity: 1
        }]
      });
    } else {
      const existingItem = cart.items.find(item =>
        item.productId.toString() === productId &&
        item.ram === variant.RAM &&
        item.storage === variant.Storage
      );
      if (existingItem) {
        if (existingItem.quantity >= 5) {
          return res.status(400).json({ success: false, message: "Cart limit reached" });
        }
        if (variant.stock <= existingItem.quantity) {
          return res.status(400).json({ success: false, message: "Not enough stock available" });
        }
        existingItem.quantity += 1;
      } else {
        cart.items.push({
          productId,
          ram: variant.RAM,
          storage: variant.Storage,
          price: finalPrice,
          quantity: 1
        });
      }
    }
    await cart.save();

    const updatedcartCount = await Cart.findOne({ userId });
    const count = updatedcartCount ? updatedcartCount.items.length : 0
    return res.json({ success: true, message: "Product added to cart", count });

  } catch (error) {
    console.error('Error adding from shop:', error);
    next(error);
  }
}

module.exports = {
  viewCartPage,
  addtoCart,
  cartUpdate,
  removecartItem,
  emptyCart,
  addfromShop
}