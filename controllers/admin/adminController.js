const User = require("../../model/user.js")
const bcrypt = require("bcrypt")

const getadminLogin = (req, res) => {

    if (req.session.admin)
        return res.render("adminDashboard")

    res.render("adminlogin", { error: null })

}
const login = async (req, res) => {

    if (req.session.admin)
        return res.render("adminDashboard")

    const { email, password } = req.body

    if (!email || !password)
        return res.render("adminlogin", { error: "All Fields re Required" })

    const user = await User.findOne({ email })
    if (!user)
        return res.render("adminlogin", { error: "Account not Found" })

    if (!user.isAdmin)
        return res.render("adminlogin", { error: "Unauthorized Access" })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch)
        return res.render("adminlogin", { error: "Invalid Credentials" })

    req.session.admin = email
    res.redirect("/admin/dashboard")
}

const adminLogout = (req,res) =>{

    try {

        req.session.destroy(err =>{
            if(err){
                console.log("Cannot destroy the Session : ",err)
               return  res.ststus(500).send("Account Logout Failed Due to some Errors")
            }
            res.clearCookie('session-id')
           return res.redirect("/admin/login")
        })
        
    } catch (error) {
        
    }


}

const adminDashbaord = (req, res) => {

    if (req.session.admin)
        return res.render("adminDashboard")

    res.render("adminlogin", { error: null })

}

const getDashboard = (req,res) =>{

    if(req.session.admin)
        return res.redirect("/admin/dashboard")

}



module.exports = {
    getadminLogin,
    login,
    adminDashbaord,
    getDashboard,
    adminLogout,

}