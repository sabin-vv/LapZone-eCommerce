const Order = require("../../model/order")
const User = require("../../model/user")
const Product = require("../../model/products")

const viewOrders = async (req, res) => {

    if (!req.session.user) return res.redirect("/")

    const userId = req.session.user
    const user = await User.findById(userId)
    const username = user.fullname

    const orders = await Order.find({ user }).populate('items.productId')

    return res.render("user/orderDetails", { orders, user, username })
}




const cancelitem = async (req, res) => {
    try {
        const { itemId, reason, comment } = req.body;


        if (!itemId || !reason) {
            return res.status(400).json({ success: false, message: 'Item ID and reason are required' });
        }


        const orderItem = await Order.findOne({
            'items._id': itemId,
            user: req.session.user, 
        });
        
        const item = orderItem.items.find(item => item._id.toString() === itemId )

        if (!item) {
            return res.status(404).json({ success: false, message: 'Order item not found' });
        }


        if (item.status === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'Item is already canceled' });
        }
        if (item.status === 'Shipped' || orderItem.orderStatus === 'Delivered') {
            return res.status(400).json({ success: false, message: 'Cannot cancel shipped or delivered item' });
        }

        
        item.status = 'CancelRequested';
        item.cancelReason = reason;
        item.cancelComment = comment || '';
        item.cancelDate = new Date();

        await orderItem.save();
        

        
        return res.status(200).json({ success: true, message: 'Item canceled successfully' });
    } catch (error) {
        console.error('Error canceling item:', error);
        return res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
};



const cancelProduct = async (req, rea) => {


    if (!req.session.user) return res.redirect("/")

    const { orderId, reason, comment } = req.body
    console.log(orderId, reason, comment)
}

module.exports = {
    viewOrders,
    cancelitem,
    cancelProduct,

}