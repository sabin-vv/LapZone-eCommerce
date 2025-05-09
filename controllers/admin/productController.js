const Product = require("../../model/products")
const Category = require("../../model/category")
const cloudinary = require("../../config/cloudinary")
const fs = require("fs")
const mongoose = require("mongoose")

const productListing = async (req, res) => {

  if (!req.session.admin) return res.redirect("/admin");


  const searchQuery = req.query.search ? req.query.search.trim() : ""
  const categoryFilter = req.query.category ? req.query.category.trim() : ""
  const priceFilter = req.query.price ? req.query.price.trim() : ""
  const sortOption = req.query.sort || "added-desc"
  const page = Number.parseInt(req.query.page) || 1
  const limit = 8
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

  const categories = await Category.find()
  console.log(categories)

  res.render("admin/addProduct", { categories, errors: null })
}

const addProduct = async (req, res) => {

  if (!req.session.admin) return res.redirect("/admin");

  const errors = {}

  const requiredFields = [
    'name', 'modelNumber', 'category', 'color', 'description',
    'brand', 'CPU', 'os', 'screen', 'graphics', 'rating',
    'count', 'regularPrice', 'salePrice', 'warranty',
  ];

  requiredFields.forEach(field => {
    if (!req.body[field] || req.body[field].toString().trim() === '') {
      errors[field] = `${field} is required`;
    }
  });


  if (req.body.rating && (isNaN(req.body.rating) || req.body.rating < 0 || req.body.rating > 5)) {
    errors.rating = 'Rating must be between 0 and 5';
  }

  if (req.body.count && (isNaN(req.body.count) || req.body.count < 0)) {
    errors.count = 'Stock count must be a positive number';
  }

  if (req.body.regularPrice && (isNaN(req.body.regularPrice) || req.body.regularPrice < 0)) {
    errors.regularPrice = 'Regular price must be a positive number';
  }

  if (req.body.salePrice && (isNaN(req.body.salePrice) || req.body.salePrice < 0)) {
    errors.salePrice = 'Sale price must be a positive number';
  }

  if (req.body.offer && (isNaN(req.body.offer) || req.body.offer < 0 || req.body.offer > 100)) {
    errors.offer = 'Offer must be between 0 and 100';

  }


  let variantsArray = req.body.variants;
  if (!variantsArray || (typeof variantsArray === 'object' && !Array.isArray(variantsArray))) {
    variantsArray = Object.values(variantsArray || {});
  }

  if (!variantsArray || !Array.isArray(variantsArray) || variantsArray.length === 0) {
    errors.variants = 'At least one variant is required';
  } else {
    errors.variants = [];
    variantsArray.forEach((variant, index) => {
      const variantErrors = {};

      if (!variant || typeof variant !== 'object') {
        variantErrors.general = 'Invalid variant data';
      } else {

        if (!variant.RAM || typeof variant.RAM !== 'string' || variant.RAM.trim() === '') {
          variantErrors.RAM = 'RAM is required';
        } else if (!/^\d+\s*(GB|TB)$/i.test(variant.RAM.trim())) {
          variantErrors.RAM = 'RAM must be in format "number GB" or "number TB"';
        }

        // Check Storage
        if (!variant.Storage || typeof variant.Storage !== 'string' || variant.Storage.trim() === '') {
          variantErrors.Storage = 'Storage is required';
        } else if (!/^\d+\s*(GB|TB)$/i.test(variant.Storage.trim())) {
          variantErrors.Storage = 'Storage must be in format "number GB" or "number TB"';
        }

        // Check priceAdjustment
        if (variant.priceAdjustment && isNaN(variant.priceAdjustment)) {
          variantErrors.priceAdjustment = 'Price adjustment must be a number';
        }
      }

      if (Object.keys(variantErrors).length > 0) {
        errors.variants[index] = variantErrors;
      }
    });
  }



  let portErrors = {}
  const portFields = ['USB Type-A', 'USB Type-C', 'HDMI', 'AudioJack', 'LAN', 'Card Reader'];
  if (req.body.ports && req.body.ports[0]) {
    portFields.forEach(field => {
      const portValue = req.body.ports[0][field];
      if (portValue && typeof portValue === 'string' && portValue.trim() !== '') {

        if (!/^(?:\d+\s*(ports?|port)|Yes|No)$/i.test(portValue.trim())) {
          portErrors[field] = `${field} must be in format "number port(s)" or Yes/No`;
        }
      }
      
    });
  }
  if (Object.keys(portErrors).length > 0) {
    errors.ports = [portErrors];
  }
  // Remove empty ports errors object if no errors
  if (errors.ports && Object.keys(errors.ports[0]).length === 0) {
    delete errors.ports;
  }

  if (Object.keys(errors).length > 0) {
    const categories = await Category.find();
    return res.render("admin/addProduct", { categories, errors });
  }  

  const fileFields = [
    "images[0].file",
    "images[1].file",
    "images[2].file",
    "images[3].file",
    "images[4].file",
  ];

  const images = [];
  const uploadPromises = []

    for (let i = 0; i < 5; i++) {
      const fieldName = `images[${i}].file`
      const fileArray = req.files?.[fieldName]

      if (fileArray && fileArray[0]) {
        const file = fileArray[0]

        
          const uploadPromise =  cloudinary.uploader.upload(file.path, {
            folder: "products",
            transformation: [
              { width: 800, height: 600, crop: "limit" },
              { quality: "auto", fetch_format: "auto" },
            ],
          }).then(result =>{

            images.push( {
              url: result.secure_url,
              isMain: i === 0,
            });
            fs.unlinkSync(file.path);

          }).catch(err => {
            console.error(`error uploading ${fieldName} :`, err)
          })

          uploadPromises.push(uploadPromise)
      }
    }
    await Promise.all(uploadPromises)
  

  if (images.length > 0 && !images.some((img) => img.isMain)) {
    images[0].isMain = true;
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
    OS: req.body.os,
    screen: req.body.screen,
    graphics: req.body.graphics,
    offer: req.body.offer || 0,
    rating: req.body.rating,
    count: req.body.count,
    isActive: req.body.isActive === 'on',
    regularPrice: req.body.regularPrice,
    salePrice: req.body.salePrice,
    warranty: req.body.warranty,
    webcam: req.body.webcam,
    variants: req.body.variants || [],
    ports: req.body.ports || [{}],
    images: images,
    isExisting: true
  };
  const product = new Product(productData);
  await product.save();

  res.redirect('/admin/products');

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
    const errors = {};
    requiredFields.forEach((field) => {
      if (!req.body[field] || req.body[field].trim() === "") {
        errors[field] = `'${field}' is required`;
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
