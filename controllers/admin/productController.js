const Product = require("../../model/products")
const cloudinary = require("../../config/cloudinary")
const fs = require("fs")
const { nextTick } = require("process")


const productListing = async (req, res) => {



    const categories = await Product.aggregate([{
        $group: { _id: "$category" }
    }])


    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalProducts = await Product.countDocuments();
    const products = await Product.find().skip(skip).limit(limit);

    const totalPages = Math.ceil(totalProducts / limit);

    res.render("productListing", {
        products,
        categories,
        currentPage: page,
        totalPages,
        query: { category: req.query.category, price: req.query.price, sort: req.query.sort }
    });
}


const newProduct = async (req, res) => {

    const categories = await Product.aggregate([{
        $group: { _id: "$category" }
    }, {
        $sort: { _id: 1 }
    }])

    res.render("admin/addProduct", { categories })
}


const editProduct = async (req, res) => {

    if (!req.session.admin)
        return res.redirect("/admin/login")

    const productId = req.params.id
    const product = await Product.findById(productId)
    const categories = await Product.aggregate([{
        $group: { _id: "$category" }
    }, {
        $sort: { _id: 1 }
    }])

    return res.render("admin/productDetails", { product, categories })

}

const updtaeProduct = async (req, res) => {
    try {


        const productId = req.params.id;
        const images = []; 
        console.log(req.files);
        console.log(Object.keys(req.files))


        if (req.files && Object.keys(req.files).length > 0) {
            const fileFields = ['images[0].file', 'images[1].file', 'images[2].file', 'images[3].file'];
            for (let i = 0; i < fileFields.length; i++) {
                const field = fileFields[i];
                if (req.files[field] && req.files[field][0]) {
                    const file = req.files[field][0];
                    const result = await cloudinary.uploader.upload(file.path, {
                        folder: 'products',
                        transformation: [
                            { width: 800, height: 600, crop: 'limit' },
                            { quality: 'auto', fetch_format: 'auto' }
                        ]
                    });
                    images.push({
                        url: result.secure_url,
                        isMain: req.body.images && Array.isArray(req.body.images) && req.body.images[i] ? req.body.images[i].isMain === 'true' : (i === 0)
                    });

                }
            }

        }

        else {
            if (req.body.images && Array.isArray(req.body.images)) {
                images.push(...req.body.images.map((img, index) => ({
                    url: img.url,
                    isMain: img.isMain === 'true'
                })));
            } else {
                // Fetch existing images from the database
                const existingProduct = await Product.findById(productId).select('images');
                if (existingProduct && existingProduct.images && existingProduct.images.length > 0) {
                    images.push(...existingProduct.images.map(img => ({
                        url: img.url,
                        isMain: img.isMain
                    })));
                }
            }
        }

        const productData = {
            ...req.body,
            images,
            variants: req.body.variants || [],
            ports: req.body.ports || [],
            isActive: req.body.isActive === 'on' ? true : false
        };
        const updatedProduct = await Product.findByIdAndUpdate(productId, productData, { new: true });
        if (!updatedProduct) {
            return res.status(404).send('Product not found');
        }

        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).send('Server Error');
    }
};


module.exports = {
    productListing,
    newProduct,
    editProduct,
    updtaeProduct,


}