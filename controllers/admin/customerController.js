const User = require("../../model/user.js")
const bcrypt = require("bcrypt")


const customerList = async (req, res) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;


        const searchQuery = req.query.search || ''; 
        let filter = {};
        if (searchQuery) {
            const regex = new RegExp(searchQuery, 'i');
            filter = {
                $or: [
                    { fullname: regex },
                    { email: regex }
                ]
            };
        }

       
        const totalUsers = await User.countDocuments(filter);
        
        const users = await User.find(filter)
            .sort({ createdAt: -1 }) 
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalUsers / limit);

        res.render("customerslist", {
            users,
            currentPage: page,
            totalPages,
            searchQuery 
        });
    } catch (error) {
        console.error('Error in customerList:', error);
        res.status(500).send('Server Error');
    }
};

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