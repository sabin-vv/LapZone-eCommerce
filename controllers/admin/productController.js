const Product = require("../../model/products")
const Category = require("../../model/category")
const cloudinary = require("../../config/cloudinary")
const fs = require("fs")
const sharp = require("sharp")


const productListing = async (req, res, next) => {
  try {
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
      const category = await Category.findOne({ name: categoryFilter });
      if (category) {
        query.categoryId = category._id;
      }
    }
    if (priceFilter) {
  switch (priceFilter) {
    case "0-50000":
      query.salePrice = { $gte: 0, $lte: 50000 };
      break;
    case "50000-100000":
      query.salePrice = { $gte: 50000, $lte: 100000 };
      break;
    case "100000+":
    case "100000plus":
    case "100000":
      query.salePrice = { $gte: 100000 };
      break;
    default:
      break;
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

    const categories = await Category.find({ isListed: true, isExisting: true }).sort({ name: 1 })

    const totalProducts = await Product.countDocuments(query)
    const totalPages = Math.ceil(totalProducts / limit)

    if (page < 1 || (totalPages > 0 && page > totalPages)) {
      return res.redirect(
        `/admin/products?search=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(categoryFilter)}&price=${encodeURIComponent(priceFilter)}&sort=${encodeURIComponent(sortOption)}&page=1`,
      )
    }

    const products = await Product.find(query).sort(sort).skip(skip).limit(limit).populate('categoryId')

    res.render("admin/productListing", {
      categories,
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
  } catch (error) {
    console.error('Error fetching products:', error);
    next(error);
  }
}
const newProduct = async (req, res, next) => {
  try {
    if (!req.session.admin) return res.redirect("/admin");

    const categories = await Category.find({ isListed: true, isExisting: true }).sort({ name: 1 })

    res.render("admin/addProduct", { categories, errors: null, formData: null })
  } catch (error) {
    console.error('Error fetching categories:', error);
    next(error);
  }
}
const addProduct = async (req, res, next) => {
  try {
    if (!req.session.admin) return res.redirect("/admin")

    const requiredFields = [
      "name",
      "modelNumber",
      "category",
      "color",
      "description",
      "brand",
      "CPU",
      "os",
      "screen",
      "graphics",
      "regularPrice",
      "salePrice",
      "warranty",
    ]

    const errors = {}

    const { name } = req.body
    const isProductExist = await Product.findOne({
      name:
      {
        $regex: new RegExp(`^${name}$`, 'i')
      }
    })
    if (isProductExist)
      errors['name'] = 'The Product already exist'

    requiredFields.forEach((field) => {
      if (!req.body[field] || req.body[field].toString().trim() === "") {
        errors[field] = `${field} is required`
      }
    })

    if (req.body.regularPrice && (isNaN(req.body.regularPrice) || req.body.regularPrice < 0)) {
      errors.regularPrice = "Regular price must be a positive number"
    }

    if (req.body.salePrice && (isNaN(req.body.salePrice) || req.body.salePrice < 0)) {
      errors.salePrice = "Sale price must be a positive number"
    }

    if (req.body.salePrice && req.body.regularPrice && !isNaN(req.body.salePrice) && !isNaN(req.body.regularPrice)) {
      const regular = parseFloat(req.body.regularPrice);
      const sale = parseFloat(req.body.salePrice);

      if (sale > regular) {
        errors.salePrice = "Sale price cannot be greater than regular price";
      }
    }

    let variantsArray = req.body.variants || []

    if (req.body.variants && typeof req.body.variants === 'object') {
      variantsArray = Array.isArray(req.body.variants) ? req.body.variants : Object.values(req.body.variants);
    }

    if (variantsArray.length === 0) {
      errors.variants = "At least one variant is required"
    } else {
      errors.variants = []
      variantsArray.forEach((variant, index) => {
        if (!variant || typeof variant !== "object") {
          return
        }

        const variantErrors = {}

        if (!variant.RAM || typeof variant.RAM !== "string" || variant.RAM.trim() === "") {
          variantErrors.RAM = "RAM is required"
        } else if (!/^\d+\s*(GB|TB)\b.*$/i.test(variant.RAM.trim())) {
          variantErrors.RAM = 'RAM must be in format "number GB" or "number TB"'
        }

        if (!variant.Storage || typeof variant.Storage !== "string" || variant.Storage.trim() === "") {
          variantErrors.Storage = "Storage is required"
        } else if (!/^\d+\s*(GB|TB)\b.*$/i.test(variant.Storage.trim())) {
          variantErrors.Storage = 'Storage must be in format "number GB" or "number TB"'
        }

        if (variant.priceAdjustment && isNaN(variant.priceAdjustment)) {
          variantErrors.priceAdjustment = "Price adjustment must be a number"
        } else if (req.body.salePrice + variant.priceAdjustment < 0)
          variantErrors.priceAdjustment = "Please enter a vaid price for selling";

        if (!variant.stock || variant.stock === "") {
          variantErrors.stock = "Stock is required"
        } else if (variant.stock && isNaN(variant.stock)) {
          variantErrors.stock = "Stock must be a number"
        } else if (variant.stock && variant.stock < 0) {
          variantErrors.stock = "Stock cannot be negative"
        }

        if (Object.keys(variantErrors).length > 0) {
          errors.variants[index] = variantErrors
        }
      })

      if (errors.variants.length === 0) {
        delete errors.variants
      } else {
        errors.variants = errors.variants.filter(Boolean)
      }
    }

    const portErrors = {}
    const ports = req.body.ports || [{}]
    const portFields = ["USB Type-A", "USB Type-C", "HDMI", "AudioJack", "LAN", "Card Reader"]
    const firstPort = ports[0] || {}

    portFields.forEach((field) => {
      const value = firstPort[field]
      if (value && value.toString().trim() === "") {
        portErrors[field] = `${field} cannot be empty if provided`
      }
    })

    if (Object.keys(portErrors).length > 0) {
      errors.ports = [portErrors]
    }

    if (errors.ports && Object.keys(errors.ports[0]).length === 0) {
      delete errors.ports
    }

    const formData = { ...req.body };
    formData.variants = variantsArray;

    if (Object.keys(errors).length > 0) {
      const categories = await Category.find()
      return res.render("admin/addProduct", { categories, errors, formData })
    }

    const fileFields = ["images[0].file", "images[1].file", "images[2].file", "images[3].file", "images[4].file"]

    const images = []
    const uploadPromises = []
    const processedFiles = new Map()
    const uploadErrors = []


    const createBufferHash = (buffer) => {
      if (!Buffer.isBuffer(buffer)) return null

      const length = buffer.length
      if (length === 0) return "empty"

      let hash = length.toString()

      const beginSample = buffer.slice(0, Math.min(100, length))
      for (let i = 0; i < beginSample.length; i += 10) {
        hash += "-" + beginSample[i].toString(16)
      }

      const middleStart = Math.max(0, Math.floor(length / 2) - 50)
      const middleSample = buffer.slice(middleStart, Math.min(middleStart + 100, length))
      for (let i = 0; i < middleSample.length; i += 10) {
        hash += "-" + middleSample[i].toString(16)
      }

      const endSample = buffer.slice(Math.max(0, length - 100), length)
      for (let i = 0; i < endSample.length; i += 10) {
        hash += "-" + endSample[i].toString(16)
      }

      return hash
    }

    for (let i = 0; i < 5; i++) {
      const fieldName = fileFields[i]
      const fileArray = req.files?.[fieldName]

      if (!fileArray || !fileArray[0]) {
        continue
      }

      const file = fileArray[0]

      if (!file.buffer && !file.path) {
        console.warn(`No buffer or path for file in ${fieldName}`)
        continue
      }

      let fileBuffer
      if (file.buffer) {
        fileBuffer = file.buffer
      } else if (file.path) {
        try {
          fileBuffer = fs.readFileSync(file.path)
        } catch (err) {
          console.error(`Error reading file ${file.path}:`, err)
          uploadErrors.push(`Failed to read file ${i + 1}: ${err.message}`)
          continue
        }
      }

      const bufferHash = createBufferHash(fileBuffer)
      if (!bufferHash) {
        console.error(`Could not create hash for ${fieldName}`)
        uploadErrors.push(`Invalid file data for image ${i + 1}`)
        continue
      }

      processedFiles.set(bufferHash, images.length)

      const uploadOptions = {
        folder: "products",
        transformation: [
          { width: 800, height: 600, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      }

      let uploadPromise
      if (fileBuffer) {
        uploadPromise = new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, result) => {
            if (err) reject(err)
            else resolve(result)
          })
          stream.end(fileBuffer)
        })
      } else {
        console.error(`No buffer available for ${fieldName}`)
        uploadErrors.push(`Invalid file data for image ${i + 1}`)
        continue
      }

      uploadPromise = uploadPromise
        .then((result) => {
          images.push({
            url: result.secure_url,
            isMain: i === 0,
          })
          if (file.path) {
            try {
              fs.unlinkSync(file.path)
            } catch (unlinkErr) {
              console.warn(`Warning: Could not delete temporary file ${file.path}:`, unlinkErr.message)
            }
          }
        })
        .catch((err) => {
          console.error(`Error uploading ${fieldName}:`, err)
          uploadErrors.push(`Failed to upload image ${i + 1}: ${err.message}`)
        })

      uploadPromises.push(uploadPromise)
    }

    await Promise.all(uploadPromises)


    if (images.length === 0) {
      errors.images = "At least one image is required"
      if (uploadErrors.length > 0) {
        errors.imageUpload = uploadErrors.join("; ")
      }
      const categories = await Category.find()
      return res.render("admin/addProduct", { categories, errors, formData })
    }

    images[0].isMain = true
    for (let i = 1; i < images.length; i++) {
      images[i].isMain = false
    }

    if (uploadErrors.length > 0) {
      errors.imageUpload = uploadErrors.join("; ")
    }
    const category = await Category.findOne({ name: req.body.category, isListed: true, isExisting: true })


    const productData = {
      name: req.body.name,
      modelNumber: req.body.modelNumber,
      categoryId: category._id,
      color: req.body.color,
      description: req.body.description,
      categoryId: category._id,
      brand: req.body.brand,
      CPU: req.body.CPU,
      OS: req.body.os,
      screen: req.body.screen,
      graphics: req.body.graphics,
      isActive: req.body.isActive === "on",
      regularPrice: req.body.regularPrice,
      salePrice: req.body.salePrice,
      warranty: req.body.warranty,
      webcam: req.body.webcam,
      variants: variantsArray.filter((v) => v && typeof v === "object"),
      ports: ports,
      images: images,
      isExisting: true,
    }

    try {
      const product = new Product(productData)
      await product.save()
      res.redirect("/admin/products")
    } catch (err) {
      console.error("Error saving product:", err)
      const categories = await Category.find()
      res.render("admin/addProduct", {
        formData,
        categories,
        errors: { database: "Failed to save product" },
      })
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    next(error);
  }
}
const editProduct = async (req, res, next) => {
  try {
    if (!req.session.admin) return res.redirect("/admin/login")

    const productId = req.params.id
    const product = await Product.findById(productId).populate('categoryId')
    const categories = await Category.find({ isListed: true, isExisting: true }).sort({ name: 1 })

    return res.render("admin/productDetails", { product, categories, errors: null, formData: null })
  } catch (error) {
    console.error('Error fetching product:', error);
    next(error);
  }
}
const updateProduct = async (req, res, next) => {
  try {
    if (!req.session.admin) return res.redirect("/admin");

    const productId = req.params.id;
    const images = [];

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
      "regularPrice",
      "salePrice",
      "warranty",
    ];
    const errors = {};
    const { regularPrice, salePrice } = req.body;
    requiredFields.forEach((field) => {
      if (!req.body[field] || req.body[field].trim() === "") {
        errors[field] = `${field} is required`;
      }
    });


    if (regularPrice && (isNaN(regularPrice) || regularPrice < 0)) {
      errors.regularPrice = "Regular price must be a non-negative number";
    }

    if (salePrice && (isNaN(salePrice) || salePrice < 0)) {
      errors.salePrice = "Sale price must be a non-negative number";
    }

    const sale = parseFloat(salePrice);
    const regular = parseFloat(regularPrice);
    if (!isNaN(sale) && !isNaN(regular) && sale > regular) {
      errors.salePrice = "Sale price cannot be greater than regular price";
    }
    let variantsArray = req.body.variants || [];

    if (typeof variantsArray === 'object') {
      variantsArray = Array.isArray(variantsArray) ? variantsArray : Object.values(variantsArray);
    }

    if (variantsArray.length === 0) {
      errors.variants = "At least one variant is required";
    } else {
      const variantErrors = [];
      variantsArray.forEach((variant, index) => {
        if (!variant || typeof variant !== "object") return;

        const vErr = {};

        if (!variant.RAM || typeof variant.RAM !== "string" || variant.RAM.trim() === "") {
          vErr.RAM = "RAM is required";
        } else if (!/^\d+\s*(GB|TB)\b.*$/i.test(variant.RAM.trim())) {
          vErr.RAM = 'RAM must be in format "number GB" or "number TB"';
        }

        if (!variant.Storage || typeof variant.Storage !== "string" || variant.Storage.trim() === "") {
          vErr.Storage = "Storage is required";
        } else if (!/^\d+\s*(GB|TB)\b.*$/i.test(variant.Storage.trim())) {
          vErr.Storage = 'Storage must be in format "number GB" or "number TB"';
        }

        const adjustment = parseFloat(variant.priceAdjustment);
        if (variant.priceAdjustment && isNaN(adjustment)) {
          vErr.priceAdjustment = "Price adjustment must be a number";
        } else if (!isNaN(sale) && sale + adjustment < 0) {
          vErr.priceAdjustment = "Final price after adjustment must be valid";
        }

        const stock = parseInt(variant.stock);
        if (variant.stock === "" || variant.stock === undefined || variant.stock === null) {
          vErr.stock = "Stock is required";
        } else if (isNaN(stock)) {
          vErr.stock = "Stock must be a number";
        } else if (stock < 0) {
          vErr.stock = "Stock cannot be negative";
        }
        variantErrors.push(Object.keys(vErr).length > 0 ? vErr : null);
        const cleanVariantErrors = variantErrors.map(err => err || null);
        if (cleanVariantErrors.some(e => e)) {
          errors.variants = cleanVariantErrors;
        }
        if (Object.keys(vErr).length > 0) {
          variantErrors[index] = vErr;
        }
      });
    }

    const category = await Category.findOne({ name: req.body.category, isListed: true, isExisting: true },);
    if (!category) {
      errors.category = 'Please select a category';
    }

    if (Object.keys(errors).length > 0) {
      const product = await Product.findById(productId);
      const categories = await Category.find({ isListed: true, isExisting: true }).sort({ name: 1 })
      return res.render("admin/productDetails", {
        product,
        categories,
        errors,
        formData: req.body,
      });
    }

    const existingProduct = await Product.findById(productId).select("images");
    const fileFields = ["images[0].file", "images[1].file", "images[2].file", "images[3].file", "images[4].file"];


    if (existingProduct && existingProduct.images && existingProduct.images.length > 0) {
      images.push(...existingProduct.images.map((img) => ({
        url: img.url,
        isMain: img.isMain,
      })));
    }

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

          images[i] = {
            url: result.secure_url,
            isMain: i === 0,
          };
          fs.unlinkSync(file.path);
        }
      }
    }


    if (images.length > 0 && !images.some((img) => img.isMain)) {
      images[0].isMain = true;
    }

    const variants = [];
    if (req.body.variants && typeof req.body.variants === "object") {
      Object.values(req.body.variants).forEach((variant) => {
        if (variant.RAM && variant.Storage) {
          variants.push({
            RAM: variant.RAM,
            Storage: variant.Storage,
            priceAdjustment: Number.parseFloat(variant.priceAdjustment) || 0,
            stock: Number.parseInt(variant.stock) || 0,
          });
        }
      });
    }

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

    const productData = {
      name: req.body.name,
      modelNumber: req.body.modelNumber,
      color: req.body.color,
      description: req.body.description,
      categoryId: category._id,
      brand: req.body.brand,
      CPU: req.body.CPU,
      OS: req.body.os || "",
      screen: req.body.screen,
      graphics: req.body.graphics,
      regularPrice: Number.parseFloat(req.body.regularPrice) || 0,
      salePrice: Number.parseFloat(req.body.salePrice) || 0,
      warranty: req.body.warranty,
      isActive: req.body.isActive === "on",
      isExisting: true,
      images,
      variants,
      ports,
    };

    const updatedProduct = await Product.findByIdAndUpdate(productId, productData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      errors.push("Product not found");
      const product = await Product.findById(productId);
      const categories = await Category.find({ isListed: true, isExisting: true }).sort({ name: 1 })
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
const toggleProduct = async (req, res, next) => {
  try {
    if (!req.session.admin) return res.redirect("/admin");

    const productId = req.params.id

    const product = await Product.findById(productId)

    if (!product) res.json({ success: false, message: "Product not found" })

    product.isActive = !product.isActive
    await product.save()

    res.json({ success: true, message: "Product status Changed" })
  } catch (error) {
    console.error('Error toggling product status:', error);
    next(error);
  }
}
const softDelete = async (req, res, next) => {
  try {
    if (!req.session.admin) return res.redirect("/admin");

    const productId = req.params.id

    const product = await Product.findById(productId)
    if (!product) return res, json({ success: false, message: "Product not found" })

    product.isExisting = !product.isExisting
    await product.save()
    return res.json({ success: true, message: "Product deleted Succesfully" })
  } catch (error) {
    console.error('Error deleting product:', error);
    next(error);
  }
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
