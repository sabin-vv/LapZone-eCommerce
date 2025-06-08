const User = require("../../model/user.js");


const customerList = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const searchQuery = req.query.search || "";
        let filter = {};
        if (searchQuery) {
            const regex = new RegExp(searchQuery, "i");
            filter = {
                $or: [{ fullname: regex }, { email: regex }],
            };
        }

        const totalUsers = await User.countDocuments(filter);

        const users = await User.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalUsers / limit);

        res.render("admin/customerslist", {
            users,
            currentPage: page,
            totalPages,
            searchQuery,
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

const customerControll = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        const { isBlocked } = req.body;
        const userId = req.params.id;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { isBlocked },
            { new: true }
        );

        return res.json({ success: true, isBlocked: updatedUser.isBlocked });
    } catch (error) {
        console.error(error);
        next(error);
    }
};


module.exports = {
    customerList,
    customerControll,
};
