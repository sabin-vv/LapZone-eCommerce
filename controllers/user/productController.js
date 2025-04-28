const Product = require("../../model/products")


const listProducts = async  (req,res) =>{

    if(!req.session.user)
        return res.redirect("/")


    const products = await Product.find()
   
    return res.render('shoppingPage',{products})


}



module.exports = {

    listProducts,

}