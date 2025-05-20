const Product = require("../../model/products")
const Category = require("../../model/category")
const mongoose = require("mongoose")

const categoryListing = async (req, res) => {

    if (!req.session.admin)
        return res.redirect("/admin/login")

    const searchQuery = req.query.search ? req.query.search.trim() : '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;


    const query = {};
    if (searchQuery) {
        query.name = { $regex: searchQuery, $options: 'i' }; // Case-insensitive search
    }

    const totalCount = await Category.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    query.isExisting = true
    if (page < 1 || (totalPages > 0 && page > totalPages)) {
        return res.redirect(`/admin/category?search=${encodeURIComponent(searchQuery)}&page=1`);
    }

    const category =  await Category.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit);

    const categoryStock = await Product.aggregate([{
        $group: { _id: "$category", count: { $max: 1 } }
    }])


    res.render("admin/categoryListing", {
        category, searchQuery, currentPage: page,
        totalPages,
        limit,
        categoryStock
    })
}


const addCategory = (req, res) => {

    if (!req.session.admin) return res.redirect("/admin");
    
    res.render("admin/addCategory", { error: null, category: null })

}


const newCategory = async (req, res) => {

    if (!req.session.admin) return res.redirect("/admin");

    const { name, description, offer, isListed } = req.body

    if (!name)
        return res.render("admin/addCategory", { error: "Name cannot be Empty" })

    const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

        const existcategory = await Category.findOne({
            name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' }
        });

    if (existcategory)
        return res.render("admin/addCategory", { error: "Category Already Exist", category: null })


    const category = new Category({
        name: name,
        description: description,
        offer: offer,
        isListed: isListed
    })

    category.save()

    res.redirect("/admin/category")

}

const categoryListUnlist = async (req, res) => {
    try {

        if (!req.session.admin) return res.redirect("/admin");

        const categoryId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).redirect('/admin/category?error=Invalid+category+ID');
        }

        const isListed = req.body.isListed === 'true' || req.body.isListed === true;


        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { isListed },
            { new: true }
        );
        if (!updatedCategory) {
            return res.status(404).redirect('/admin/category?error=Category+not+found');
        }

        await Product.updateMany(
            { category: updatedCategory.name }, 
            { isActive: isListed })
        

        res.redirect('/admin/category?success=Category+updated');
    } catch (error) {
        res.status(500).redirect('/admin/category?error=Server+error');
    }
};

const editCategory = async (req, res) => {

    if (!req.session.admin) return res.redirect("/admin");

    const categoryId = req.params.id
    
    const category = await Category.findOne({ _id: categoryId })
    if (!category)
        return res.redirect("/admin/category")

    const categories = await Category.find().sort({ name: 1 });


    res.render("admin/editCategory", { category: category, categories })
}

const updateCategory = async (req, res) => {

    if (!req.session.admin) return res.redirect("/admin");

    const categoryId = req.params.id
    const categoryData = req.body

    const updateData = {
        name: categoryData.name,
        description: categoryData.description || '',
        offer: categoryData.offer ? Number(categoryData.offer) : 0,
        isListed: categoryData.isListed === 'true'
    }
    await Category.updateOne({ _id: categoryId }, { $set: updateData })


    res.redirect("/admin/category")
}

const softdeleteCategory = async (req, res) => {

    if (!req.session.admin) return res.redirect("/admin");

    const categoryId = req.params.id
    const category = await Category.findById(categoryId)
    
    if (!category)
        return res.json({ success: false, message: "Category not Found" })

    category.isExisting = false
    await category.save()

    return res.json({ success: true, message: "Category Deleted Succesfully" })
}

module.exports = {
    categoryListing,
    addCategory,
    newCategory,
    categoryListUnlist,
    editCategory,
    updateCategory,
    softdeleteCategory,

}