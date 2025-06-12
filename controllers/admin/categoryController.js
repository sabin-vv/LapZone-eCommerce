const Product = require("../../model/products")
const Category = require("../../model/category")
const mongoose = require("mongoose")

const categoryListing = async (req, res, next) => {
    try {
        if (!req.session.admin)
            return res.redirect("/admin/login")

        const searchQuery = req.query.search ? req.query.search.trim() : '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;


        const query = {};
        if (searchQuery) {
            query.name = { $regex: searchQuery, $options: 'i' };
        }

        const totalCount = await Category.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;

        query.isExisting = true
        if (page < 1 || (totalPages > 0 && page > totalPages)) {
            return res.redirect(`/admin/category?search=${encodeURIComponent(searchQuery)}&page=1`);
        }

        const category = await Category.find(query)
            .sort({ addedDate: -1 })
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
    } catch (error) {
        console.error('Error fetching categories:', error);
        next(error);
    }
}

const addCategory = (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        res.render("admin/addCategory", { error: null, category: null })
    } catch (error) {
        console.error('Error fetching categories:', error);
        next(error);
    }

}

const newCategory = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        const { name, description, offer, isListed } = req.body

        const error = {}

        if (!name)
            error['name'] = "Name cannot be Empty"

        if (!description)
            error['description'] = "Description cannot be Empty"

        if (Object.keys(error).length > 0)
            return res.render("admin/addCategory", { error, category: null })

        const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

        const existcategory = await Category.findOne({
            name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' }

        });

        if (existcategory) {
            error['name'] = "Category Already Exist"
            return res.render("admin/addCategory", { error, category: null })
        }

        const category = new Category({
            name: name,
            description: description,
            offer: offer,
            isListed: isListed
        })

        category.save()

        res.redirect("/admin/category")
    } catch (error) {
        console.error('Error fetching categories:', error);
        next(error);
    }

}

const categoryListUnlist = async (req, res, next) => {
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
        console.error('Error updating category:', error);
        next(error);
    }
};

const editCategory = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        const categoryId = req.params.id

        const category = await Category.findOne({ _id: categoryId })
        if (!category)
            return res.redirect("/admin/category")

        const categories = await Category.find().sort({ name: 1 });


        res.render("admin/editCategory", { category: category, categories, error: null })
    } catch (error) {
        console.error('Error fetching categories:', error);
        next(error);
    }
}

const updateCategory = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        const categoryId = req.params.id
        const categoryData = req.body
        let error = {}
        const categoryNameExist = await Category.findOne({
             name: { $regex: new RegExp(`^${categoryData.name.trim()}$`, 'i') },
            _id: { $ne: categoryId }
        })
        categoryData._id = categoryId

        if (categoryNameExist) {
            error['name'] = "Category Name Already Exist"
            return res.render("admin/editCategory", { category: categoryData, error })
        }

        const updateData = {
            name: categoryData.name,
            description: categoryData.description || '',
            offer: categoryData.offer ? Number(categoryData.offer) : 0,
            isListed: categoryData.isListed === 'true'
        }
        await Category.updateOne({ _id: categoryId }, { $set: updateData })

        res.redirect("/admin/category")
    } catch (error) {
        console.error('Error fetching categories:', error);
        next(error);
    }
}

const softdeleteCategory = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        const categoryId = req.params.id
        const category = await Category.findById(categoryId)

        if (!category)
            return res.json({ success: false, message: "Category not Found" })

        category.isExisting = false
        await category.save()

        return res.json({ success: true, message: "Category Deleted Succesfully" })
    } catch (error) {
        console.error('Error fetching categories:', error);
        next(error);
    }
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