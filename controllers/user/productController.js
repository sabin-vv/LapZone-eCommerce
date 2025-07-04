const Category = require("../../model/category");
const Product = require("../../model/products");
const Wishlist = require("../../model/wishlist")

const listProducts = async (req, res, next) => {
  try {
    const user = req.session.user;
    const username = req.session.username
    const searchQuery = req.query.search ? req.query.search.trim() : "";
    const categoryFilter = req.query.category ? (Array.isArray(req.query.category) ? req.query.category : req.query.category.split(",")) : [];
    const brandFilter = req.query.brand ? (Array.isArray(req.query.brand) ? req.query.brand : req.query.brand.split(",")) : [];
    const ramFilter = req.query.ram ? (Array.isArray(req.query.ram) ? req.query.ram : req.query.ram.split(",")) : [];
    const ssdFilter = req.query.ssd ? (Array.isArray(req.query.ssd) ? req.query.ssd : req.query.ssd.split(",")) : [];
    const graphicsFilter = req.query.graphics ? (Array.isArray(req.query.graphics) ? req.query.graphics : req.query.graphics.split(",")) : [];
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    const sortOption = req.query.sort || "popularity";
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    const query = { isActive: true, isExisting: true };
    if (searchQuery) {
      query.name = { $regex: searchQuery, $options: "i" };
    }
    if (categoryFilter.length > 0) {
      const matchedCategories = await Category.find({
        name: { $in: categoryFilter },
        isListed: true,
        isExisting: true
      }, '_id');

      query.categoryId = {
        $in: matchedCategories.map(cat => cat._id)
      };
    }
    if (brandFilter.length > 0) {
      query.brand = { $in: brandFilter };
    }
    if (ramFilter.length > 0) {
      query.variants = {
        $elemMatch: {
          RAM: { $in: ramFilter.map(ram => new RegExp("^" + ram, "i")) }
        }
      };
    }
    if (ssdFilter.length > 0) {
      query.variants = {
        $elemMatch: {
          Storage: { $in: ssdFilter.map(ssd => new RegExp("^" + ssd, "i")) }
        }
      }
    }
    if (graphicsFilter.length > 0) {
      query.graphics = { $in: graphicsFilter };
    }
    if (maxPrice) {
      query.salePrice = { $lte: maxPrice };
    }

    let products;
    const wishlist = await Wishlist.findOne({ userId: req.session.user })
    const wishlistIds = wishlist ? wishlist.items.map(item => item.productId.toString()) : []

    // For price sorting, use client-side calculation to match frontend exactly
    if (sortOption === "price-asc" || sortOption === "price-desc") {
      // Get all products first
      const allProducts = await Product.find(query).populate('categoryId');
      
      // Calculate final price for each product (matching frontend logic exactly)
      const productsWithFinalPrice = allProducts.map(product => {
        const productOffer = product.offer || 0;
        const categoryOffer = product.categoryId?.offer || 0;
        const finalOffer = Math.max(productOffer, categoryOffer);
        
        // Find first variant with stock > 0 (exactly like frontend)
        const item = product.variants.find(v => v.stock > 0);
        const basePrice = product.salePrice + (item?.priceAdjustment || 0);
        const finalPrice = finalOffer > 0 
          ? Math.round(basePrice * (1 - finalOffer / 100)) 
          : basePrice;
        
        return {
          ...product.toObject(),
          finalPrice: finalPrice
        };
      });
      
      // Sort by final price
      if (sortOption === "price-asc") {
        productsWithFinalPrice.sort((a, b) => a.finalPrice - b.finalPrice);
      } else {
        productsWithFinalPrice.sort((a, b) => b.finalPrice - a.finalPrice);
      }
      
      // Apply pagination
      products = productsWithFinalPrice.slice(skip, skip + limit);
      
    } else {
      const sort = {};
      if (sortOption === "popularity") {
        sort.rating = -1;
      } else if (sortOption === "newest") {
        sort.createdAt = -1;
      } else if (sortOption === 'name-asc') {
        sort.name = 1;
      } else if (sortOption === 'name-desc') {
        sort.name = -1;
      }
      
      products = await Product.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('categoryId');
    }

    try {
      const brands = await Product.distinct("brand");
      const ramvariants = await Product.distinct("variants.RAM");
      const rams = [...new Set(ramvariants.map(ram => ram.split(" ")[0]))];
      const ssdvariants = await Product.distinct("variants.Storage");
      const ssds = [...new Set(ssdvariants.map(ssd => ssd.split(" ")[0]))];
      const graphics = await Product.distinct("graphics");


      const totalProducts = await Product.countDocuments(query);
      const totalPages = Math.ceil(totalProducts / limit);
      const categories = await Category.find({ isListed: true, isExisting: true }).sort({ name: 1 });

      const currentQueryString = req.originalUrl.split('?')[1] || '';

      res.render("user/shoppingPage", {
        products,
        categories,
        user,
        username,
        brands,
        rams,
        ssds,
        graphics,
        searchQuery,
        query: {
          category: categoryFilter,
          brand: brandFilter,
          ram: ramFilter,
          ssd: ssdFilter,
          graphics: graphicsFilter,
          sort: sortOption,
          maxPrice: maxPrice || null
        },
        currentPage: page,
        totalPages,
        totalProducts,
        wishlistIds,
        currentQueryString,
      });
    } catch (error) {
      res.render("user/shoppingPage", {
        products: [],
        user,
        username,
        brands: [],
        rams: [],
        ssds: [],
        graphics: [],
        searchQuery: "",
        query: {
          brand: [],
          ram: [],
          ssd: [],
          graphics: [],
          sort: "popularity",
          maxPrice: null,

        },
        currentPage: 1,
        totalPages: 0,
        totalProducts: 0,
        error: "Failed to load products",
      });
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    next(error);
  }
};
const viewProduct = async (req, res, next) => {
  try {
    const user = req.session?.user;
    const username = user?.fullname
    const productId = req.params.id;

    const product = await Product.findById(productId).populate('categoryId')
    const suggesionCategory = product.categoryId;

    const productSuggesions = await Product.find({ categoryId: suggesionCategory, _id: { $ne: productId } }).limit(4)

    const wishlist = await Wishlist.findOne({ userId: user });

    let isWishlisted = false;
    if (wishlist && wishlist.items) {
      isWishlisted = wishlist.items.some(item => item.productId.toString() === productId.toString());
    }

    res.render("user/productPage", {
      product,
      user,
      username,
      productSuggesions,
      isWishlisted,
      variants: product.variants
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    next(error);
  }
}

module.exports = {
  listProducts,
  viewProduct,
};