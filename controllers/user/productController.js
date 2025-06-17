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
      query.category = { $in: categoryFilter };
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


    const sort = {};
    if (sortOption === "popularity") {
      sort.rating = -1;
    } else if (sortOption === "newest") {
      sort.createdAt = -1;
    } else if (sortOption === "price-asc") {
      sort.salePrice = 1;
    } else if (sortOption === "price-desc") {
      sort.salePrice = -1;
    } else if (sortOption === 'name-asc') {
      sort.name = 1
    } else if (sortOption === 'name-desc') {
      sort.name = -1
    }

    try {

      const wishlist = await Wishlist.findOne({ userId: req.session.user })
      const wishlistIds = wishlist ? wishlist.items.map(item => item.productId.toString()) : []
      const products = await Product.find(query).sort(sort).skip(skip).limit(limit).populate('categoryId')
      const brands = await Product.distinct("brand");
      const ramvariants = await Product.distinct("variants.RAM");
      const rams = [...new Set(ramvariants.map(ram => ram.split(" ")[0]))];
      const ssdvariants = await Product.distinct("variants.Storage");
      const ssds = [...new Set(ssdvariants.map(ssd => ssd.split(" ")[0]))];
      const graphics = await Product.distinct("graphics");


      const totalProducts = await Product.countDocuments(query);
      const totalPages = Math.ceil(totalProducts / limit);
      const categories = await Category.find({ isListed: true, isExisting: true }).sort({ name: 1 });

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
        wishlistIds
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
    if (!req.session.user) return res.redirect("/login");

    const user = req.session.user;
    const username = user.fullname
    const productId = req.params.id;

    const product = await Product.findById(productId).populate('categoryId')
    const suggesionCategory = product.category;

    const productSuggesions = await Product.find({ category: suggesionCategory, _id: { $ne: productId } })

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