const User = require("../../model/user")
const userController = require("./userController")

const viewReferralPage = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect("/")

        const user = await User.findById(req.session.user)

        if (!user.referralCode) {
            user.referralCode = userController.generateReferralCode()
            await user.save()
        }
        const totalReferrals = await User.countDocuments({ refferedBy: user._id })
        const totalEarnings = totalReferrals * 1000

        return res.render("user/referralPage", { user, totalReferrals, totalEarnings })
    } catch (error) {
        console.error('Error fetching referral page:', error);
        next(error);
    }

}

module.exports = {
    viewReferralPage,

}