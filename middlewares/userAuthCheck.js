const User = require("../model/user")


const userAuthCheck = async (req, res, next) => {

    if (!req.session.user)
        return res.redirect("/login")


    const user = await User.findById(req.session.user)

    if (!user)
        return res.redirect("/login")

    if (user.isBlocked)
        return res.render("user/userLogin", { user: null, username: null, products: null, error: null })


    next()

}


module.exports = userAuthCheck