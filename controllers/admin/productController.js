const Product = require("../../model/products")
const cloudinary = require("../../config/cloudinary")
const fs = require("fs")

const productListing = async (req, res) => {

  if (!req.session.admin) return res.redirect("/admin");


  const searchQuery = req.query.search ? req.query.search.trim() : ""
  const categoryFilter = req.query.category ? req.query.category.trim() : ""
  const priceFilter = req.query.price ? req.query.price.trim() : ""
  const sortOption = req.query.sort || "price-desc"
  const page = Number.parseInt(req.query.page) || 1
  const limit = 10
  const skip = (page - 1) * limit

  const query = {}
  if (searchQuery) {
    query.name = { $regex: searchQuery, $options: "i" }
  }
  if (categoryFilter) {
    query.category = categoryFilter
  }
  if (priceFilter) {
    if (priceFilter === "0-500") {
      query.salePrice = { $gte: 0, $lte: 500 }
    } else if (priceFilter === "500-1000") {
      query.salePrice = { $gte: 500, $lte: 1000 }
    } else if (priceFilter === "1000+") {
      query.salePrice = { $gte: 1000 }
    }
  }

  query.isExisting = true

  const sort = {}
  if (sortOption === "price-asc") {
    sort.salePrice = 1
  } else if (sortOption === "price-desc") {
    sort.salePrice = -1
  } else if (sortOption === "added-desc") {
    sort.createdAt = -1
  }

  const categories = await Product.aggregate([
    { $group: { _id: "$category" } },
    { $project: { name: "$_id", _id: 0 } },
    { $sort: { updatedAt: -1 } },
  ])

  const totalProducts = await Product.countDocuments(query)
  const totalPages = Math.ceil(totalProducts / limit)

  if (page < 1 || (totalPages > 0 && page > totalPages)) {
    return res.redirect(
      `/admin/products?search=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(categoryFilter)}&price=${encodeURIComponent(priceFilter)}&sort=${encodeURIComponent(sortOption)}&page=1`,
    )
  }

  const products = await Product.find(query).sort(sort).skip(skip).limit(limit)

  res.render("admin/productListing", {
    products,
    categories,
    searchQuery,
    query: {
      category: categoryFilter,
      price: priceFilter,
      sort: sortOption,
    },
    currentPage: page,
    totalPages,
    limit,
  })
}

const newProduct = async (req, res) => {
  
  if (!req.session.admin) return res.redirect("/admin");

  const categories = await Product.aggregate([
    {
      $group: { _id: "$category" },
    },
    {
      $sort: { _id: 1 },
    },
  ])

  res.render("admin/addProduct", { categories })
}

const addProduct = async (req, res) => {
  try {
    if (!req.session.admin) return res.redirect("/admin");



console.log(req.body.ports)
    const fileFields = [
      "images[0].file",
      "images[1].file",
      "images[2].file",
      "images[3].file",
      "images[4].file",
    ];
    const images = [];

    
    
    // Validate required fields
    const requiredFields = [
      "name",
      "modelNumber",
      "category",
      "color",
      "description",
      "brand",
      "CPU",
      "screen",
      "graphics",
      "rating",
      "count",
      "regularPrice",
      "salePrice",
      "warranty",
    ];
    const errors = [];
    requiredFields.forEach((field) => {
      if (!req.body[field] || req.body[field].trim() === "") {
        errors.push(`Field '${field}' is required`);
      }
    });

    // Validate numeric fields
    const numericFields = ["regularPrice", "salePrice", "rating", "count", "offer"];
    numericFields.forEach((field) => {
      if (req.body[field] && isNaN(Number(req.body[field]))) {
        errors.push(`Field '${field}' must be a valid number`);
      }
    });

    // Validate at least one image is uploaded
    if (!req.files || !req.files["images[0].file"]) {
      errors.push("Main product image is required");
    }

    // Validate variants (at least one variant with RAM and Storage)
    let hasValidVariant = false;
    
    if (req.body.variants && typeof req.body.variants === "object") {
      Object.values(req.body.variants).forEach((variant, index) => {
        if (!variant.RAM || variant.RAM.trim() === "") {
          errors.push(`Variant ${index + 1}: RAM is required`);
        }
        if (!variant.Storage || variant.Storage.trim() === "") {
          errors.push(`Variant ${index + 1}: Storage is required`);
        }
        if (variant.RAM && variant.Storage) {
          hasValidVariant = true;
        }
        if (variant.priceAdjustment && isNaN(Number(variant.priceAdjustment))) {
          errors.push(`Variant ${index + 1}: Price Adjustment must be a valid number`);
        }
      });
    }
    if (!hasValidVariant) {
      errors.push("At least one valid variant with RAM and Storage is required");
    }
console.log("1st check")
    if (errors.length > 0) {
      const categories = await Product.aggregate([
        { $group: { _id: "$category" } },
        { $sort: { _id: 1 } },
      ]);
      return res.render("admin/addProduct", {
        product: null,
        categories,
        errors,
        formData: req.body,
      });
    }

    console.log("2nd check")
    // Process image uploads
    if (req.files && Object.keys(req.files).length > 0) {
      
      
      for (let i = 0; i < fileFields.length; i++) {
        const field = fileFields[i];
        if (req.files[field] && req.files[field][0]) {
          const file = req.files[field][0];
          console.log("Uploading image:", file.path);
          try {
            
            const result = await cloudinary.uploader.upload(file.path, {
              folder: "products",
              transformation: [
                { width: 800, height: 600, crop: "limit" },
                { quality: "auto", fetch_format: "auto" },
              ],
            });
            console.log("Uploaded to Cloudinary:", result.secure_url);
            images[i] = {
              url: result.secure_url,
              isMain: i === 0, 
            };
            fs.unlinkSync(file.path);

          } catch (err) {
            console.error(`Failed to upload ${field}:`, err.message);
          }
           
        }
      }
    }

    // Ensure at least one image is marked as main
    if (images.length > 0 && !images.some((img) => img.isMain)) {
      images[0].isMain = true;
    }

    // Parse and validate variants
    const variants = [];
    if (req.body.variants && typeof req.body.variants === "object") {
      Object.values(req.body.variants).forEach((variant) => {
        if (variant.RAM && variant.Storage) {
          variants.push({
            RAM: variant.RAM,
            Storage: variant.Storage,
            priceAdjustment: Number.parseFloat(variant.priceAdjustment) || 0,
          });
        }
      });
    }

    // Parse and validate ports
    const ports = [];
    if (req.body.ports && req.body.ports[0]) {
      const portData = req.body.ports[0];
      const portObj = {};
      if (portData["USB Type-A"]) portObj["USB Type-A"] = portData["USB Type-A"];
      if (portData["USB Type-C"]) portObj["USB Type-C"] = portData["USB Type-C"];
      if (portData["HDMI"]) portObj["HDMI"] = portData["HDMI"];
      if (portData["AudioJack"]) portObj["AudioJack"] = portData["AudioJack"];
      if (portData["LAN"]) portObj["LAN"] = portData["LAN"];
      if (portData["Card Reader"]) portObj["Card Reader"] = portData["Card Reader"];
      if (Object.keys(portObj).length > 0) ports.push(portObj);
    }

    // Prepare product data
    const productData = {
      name: req.body.name,
      modelNumber: req.body.modelNumber,
      category: req.body.category,
      color: req.body.color,
      description: req.body.description,
      brand: req.body.brand,
      CPU: req.body.CPU,
      OS: req.body.os || "",
      screen: req.body.screen,
      graphics: req.body.graphics,
      offer: Number.parseFloat(req.body.offer) || 0,
      rating: Number.parseFloat(req.body.rating) || 0,
      count: Number.parseInt(req.body.count) || 0,
      regularPrice: Number.parseFloat(req.body.regularPrice) || 0,
      salePrice: Number.parseFloat(req.body.salePrice) || 0,
      warranty: req.body.warranty,
      webcam: req.body.webcam || "",
      isActive: req.body.isActive === "on",
      isExisting: true,
      images,
      variants,
      ports,
    };

    // Create and save new product
    const newProduct = new Product(productData);
    await newProduct.save();

    console.log("Product created successfully:", newProduct);
    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error creating product:", error);
    const categories = await Product.aggregate([
      { $group: { _id: "$category" } },
      { $sort: { _id: 1 } },
    ]);
    res.render("admin/addProduct", {
      product: null,
      categories,
      errors: [error.message || "Failed to create product"],
      formData: req.body,
    });
  }
}

const editProduct = async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login")

  const productId = req.params.id
  const product = await Product.findById(productId)
  const categories = await Product.aggregate([
    {
      $group: { _id: "$category" },
    },
    {
      $sort: { _id: 1 },
    },
  ])

  return res.render("admin/productDetails", { product, categories })
}

const updateProduct = async (req, res) => {
  try {

    if (!req.session.admin) return res.redirect("/admin");


    console.log(req.body)
    const productId = req.params.id;
    const images = [];

    // Validate required fields
    const requiredFields = [
      "name",
      "modelNumber",
      "category",
      "color",
      "description",
      "brand",
      "CPU",
      "screen",
      "graphics",
      "rating",
      "count",
      "regularPrice",
      "salePrice",
      "warranty",
    ];
    const errors = [];
    requiredFields.forEach((field) => {
      if (!req.body[field] || req.body[field].trim() === "") {
        errors.push(`Field '${field}' is required`);
      }
    });

    // Validate numeric fields
    const numericFields = ["regularPrice", "salePrice", "rating", "count", "offer"];
    numericFields.forEach((field) => {
      if (req.body[field] && isNaN(Number(req.body[field]))) {
        errors.push(`Field '${field}' must be a valid number`);
      }
    });

    if (errors.length > 0) {
      const product = await Product.findById(productId);
      const categories = await Product.aggregate([{ $group: { _id: "$category" } }, { $sort: { _id: 1 } }]);
      return res.render("admin/productDetails", {
        product,
        categories,
        errors,
        formData: req.body,
      });
    }

    // Handle image uploads and existing images
    const existingProduct = await Product.findById(productId).select("images");
    const fileFields = ["images[0].file", "images[1].file", "images[2].file", "images[3].file", "images[4].file"];

    // Initialize images array with existing images
    if (existingProduct && existingProduct.images && existingProduct.images.length > 0) {
      images.push(...existingProduct.images.map((img) => ({
        url: img.url,
        isMain: img.isMain,
      })));
    }

    // Process new images
    if (req.files && Object.keys(req.files).length > 0) {
      for (let i = 0; i < fileFields.length; i++) {
        const field = fileFields[i];
        if (req.files[field] && req.files[field][0]) {
          const file = req.files[field][0];
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "products",
            transformation: [
              { width: 800, height: 600, crop: "limit" },
              { quality: "auto", fetch_format: "auto" },
            ],
          });
          // Replace or add the image at the corresponding index
          images[i] = {
            url: result.secure_url,
            isMain: i === 0,
          };
          fs.unlinkSync(file.path);
        }
      }
    }

    // Ensure at least one image is marked as main
    if (images.length > 0 && !images.some((img) => img.isMain)) {
      images[0].isMain = true;
    }

    // Parse and validate variants
    const variants = [];
    if (req.body.variants && typeof req.body.variants === "object") {
      Object.values(req.body.variants).forEach((variant) => {
        if (variant.RAM && variant.Storage) {
          variants.push({
            RAM: variant.RAM,
            Storage: variant.Storage,
            priceAdjustment: Number.parseFloat(variant.priceAdjustment) || 0,
          });
        }
      });
    }

    // Parse and validate ports
    const ports = [];
    if (req.body.ports && req.body.ports[0]) {
      const portData = req.body.ports[0];
      const portObj = {};
      if (portData["USB Type-A"]) portObj["USB Type-A"] = portData["USB Type-A"];
      if (portData["USB Type-C"]) portObj["USB Type-C"] = portData["USB Type-C"];
      if (portData["HDMI"]) portObj["HDMI"] = portData["HDMI"];
      if (portData["AudioJack"]) portObj["AudioJack"] = portData["AudioJack"];
      if (portData["LAN"]) portObj["LAN"] = portData["LAN"];
      if (portData["Card Reader"]) portObj["Card Reader"] = portData["Card Reader"];
      if (Object.keys(portObj).length > 0) ports.push(portObj);
    }

    // Prepare product data
    const productData = {
      name: req.body.name,
      modelNumber: req.body.modelNumber,
      category: req.body.category,
      color: req.body.color,
      description: req.body.description,
      brand: req.body.brand,
      CPU: req.body.CPU,
      OS: req.body.os || "",
      screen: req.body.screen,
      graphics: req.body.graphics,
      offer: Number.parseFloat(req.body.offer) || 0,
      rating: Number.parseFloat(req.body.rating) || 0,
      count: Number.parseInt(req.body.count) || 0,
      regularPrice: Number.parseFloat(req.body.regularPrice) || 0,
      salePrice: Number.parseFloat(req.body.salePrice) || 0,
      warranty: req.body.warranty,
      webcam: req.body.webcam || "",
      isActive: req.body.isActive === "on",
      isExisting: true,
      images,
      variants,
      ports,
    };

    // Log the final product data
    console.log("Product Data to Update:", JSON.stringify(productData, null, 2));

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(productId, productData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      errors.push("Product not found");
      const product = await Product.findById(productId);
      const categories = await Product.aggregate([{ $group: { _id: "$category" } }, { $sort: { _id: 1 } }]);
      return res.render("admin/productDetails", {
        product,
        categories,
        errors,
        formData: req.body,
      });
    }

    console.log("Product updated successfully:", updatedProduct);
    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error updating product:", error);
    const product = await Product.findById(req.params.id);
    const categories = await Product.aggregate([{ $group: { _id: "$category" } }, { $sort: { _id: 1 } }]);
    res.render("admin/productDetails", {
      product,
      categories,
      errors: [error.message || "Failed to update product"],
      formData: req.body,
    });
  }
};

const toggleProduct = async (req, res) => {

  if (!req.session.admin) return res.redirect("/admin");

  const productId = req.params.id

  const product = await Product.findById(productId)

  if (!product) res.json({ success: false, message: "Product not found" })

  product.isActive = !product.isActive
  await product.save()

  res.json({ success: true, message: "Product status Changed" })
}

const softDelete = async (req, res) => {

  if (!req.session.admin) return res.redirect("/admin");
  
  const productId = req.params.id

  const product = await Product.findById(productId)
  if (!product) return res, json({ success: false, message: "Product not found" })

  product.isExisting = !product.isExisting
  await product.save()
  return res.json({ success: true, message: "Product deleted Succesfully" })
}

module.exports = {
  productListing,
  newProduct,
  addProduct,
  editProduct,
  updateProduct,
  toggleProduct,
  softDelete,
}
