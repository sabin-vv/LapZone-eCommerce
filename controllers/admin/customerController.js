const User = require("../../model/user.js");


const customerList = async (req, res) => {
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
        console.error("Error in customerList:", error);
        res.status(500).send("Server Error");
    }
};



const customerControll = async (req, res) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

    
        const userId = req.params.id;
        const isBlocked = req.body.isBlocked === "true";

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { isBlocked },
            { new: true }
        );

        res.redirect("/admin/customers");
    } catch (error) {
        res.status(500).send("Server Error");
    }
};

module.exports = {
    customerList,
    customerControll,
};
