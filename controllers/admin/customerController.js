const User = require("../../model/user.js")
const bcrypt = require("bcrypt")


const customerList = async (req, res) => {

    try {

        if (!req.session.admin)
            return res.redirect("/admin")

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const totalUsers = await User.countDocuments();
        const users = await User.find().skip(skip).limit(limit);

        const totalPages = Math.ceil(totalUsers / limit);

        res.render("customerslist", {
            users,
            currentPage: page,
            totalPages
        });

    } catch (error) {

        console.error('Error updating user:', error);
        res.status(500).send('Server Error');


    }



}

const customerControll = async (req, res) => {

    try {

        const userId = req.params.id;
        const isBlocked = req.body.isBlocked === 'true'; // Convert string to boolean
        console.log(`Updating user ${userId}: isBlocked = ${isBlocked}`); // Debug log

        const updatedUser = await User.findByIdAndUpdate(userId, { isBlocked }, { new: true });
        console.log('Updated user:', updatedUser.isBlocked); // Debug log

        res.redirect('/admin/customers'); // Redirect to customer list

    } catch (error) {

        console.error('Error updating user:', error);
        res.status(500).send('Server Error');

    }
}



module.exports = {
    customerList,
    customerControll,

}