const Product = require("../../model/products");

const listProducts = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const user = req.session.user;
  const searchQuery = req.query.search ? req.query.search.trim() : "";
  const brandFilter = req.query.brand ? (Array.isArray(req.query.brand) ? req.query.brand : req.query.brand.split(",")) : [];
  const ramFilter = req.query.ram ? (Array.isArray(req.query.ram) ? req.query.ram : req.query.ram.split(",")) : [];
  const ssdFilter = req.query.ssd ? (Array.isArray(req.query.ssd) ? req.query.ssd : req.query.ssd.split(",")) : [];
  const graphicsFilter = req.query.graphics ? (Array.isArray(req.query.graphics) ? req.query.graphics : req.query.graphics.split(",")) : [];
  const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
  const sortOption = req.query.sort || "popularity";
  const page = parseInt(req.query.page) || 1;
  const limit = 9; // 9 products per page for 3x3 grid
  const skip = (page - 1) * limit;

  

  // Build query
  const query = { isActive: true, isExisting: true };
  if (searchQuery) {
    query.name = { $regex: searchQuery, $options: "i" };
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
      $elemMatch:{
        Storage:{$in: ssdFilter.map(ssd => new RegExp("^" + ssd,"i"))}
      }
    }
  }
  if (graphicsFilter.length > 0) {
    query.graphics = { $in: graphicsFilter };
  }
  if (maxPrice) {
    query.salePrice = { $lte: maxPrice };
  }

  // Build sort
  const sort = {};
  if (sortOption === "popularity") {
    sort.rating = -1;
  } else if (sortOption === "newest") {
    sort.createdAt = -1;
  } else if (sortOption === "price-asc") {
    sort.salePrice = 1;
  } else if (sortOption === "price-desc") {
    sort.salePrice = -1;
  }

  try {
    // Fetch products
    const products = await Product.find(query).sort(sort).skip(skip).limit(limit);

    // Fetch filter options
    const brands = await Product.distinct("brand");
    const ramvariants = await Product.distinct("variants.RAM");
    const rams = [...new Set(ramvariants.map(ram => ram.split(" ")[0]))];
    const ssdvariants = await Product.distinct("variants.Storage");
    const ssds = [...new Set(ssdvariants.map(ssd => ssd.split(" ")[0]))];
    const graphics = await Product.distinct("graphics");

    // Pagination
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    res.render("user/shoppingPage", {
      products,
      user,
      brands,
      rams,
      ssds,
      graphics,
      searchQuery,
      query: {
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
    });
  } catch (error) {
    res.render("user/shoppingPage", {
      products: [],
      user,
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
        maxPrice: null
      },
      currentPage: 1,
      totalPages: 0,
      totalProducts: 0,
      error: "Failed to load products",
    });
  }
};



const viewProduct =async  (req,res) =>{

  if(!req.session.user)
    return res.redirect("/")

  const user = req.session.user
  const productId  = req.params.id
  const product = await Product.findById(productId)
  

  res.render("user/productPage",{product,user})
}

module.exports = {
  listProducts,
  viewProduct,
};