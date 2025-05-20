const Order = require("../../model/order")
const Product = (require("../../model/products"))




const listOrders = async (req, res) => {

    if (!req.session.admin) return res.redirect("/admin")

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
        Order.find()
            .populate("user")
            .populate("items.productId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Order.countDocuments()
    ]);

    const totalPages = Math.ceil(totalCount / limit);


    res.render("admin/orderList", { orders, currentPage: page, totalPages })

}

const updateOrderStatus = async (req, res) => {

    if (!req.session.admin) return res.redirect("/admin")

    const { orderId, status } = req.body;

    try {

        if (!orderId || !status) {
            return res.status(400).json({ success: false, message: 'Order ID and status are required' });
        }

        const validStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }


        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }


        order.orderStatus = status;


        order.statusHistory.forEach(history => {
            history.current = false;
        });
        order.statusHistory.push({
            status,
            date: new Date(),
            current: true
        });


        if (status === 'Cancelled') {
            order.paymentStatus = 'Cancelled';
        } else if (status === 'Delivered') {
            order.paymentStatus = 'Completed';
        }

        await order.save();

        res.status(200).json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }

}


const viewOrder = async (req, res) => {
    try {
        if (!req.session.admin) return res.redirect("/admin")

        const orderId = req.params.id;
        const order = await Order.findById(orderId)
            .populate('user')
            .populate('items.productId')
            .exec();

        if (!order) {
            return res.status(404).send('Order not found');
        }

        res.render('admin/viewOrder', { order });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).send('Server error');
    }
};

const updateItemStatus = async (req, res) => {

    if (!req.session.admin) return res.redirect("/admin")

    const itemId = req.params.id
    const newStatus = req.body.itemStatus;

    const order = await Order.findOne({ 'items._id': itemId })

    if (!order)
        return res.redirect(`/admin/orders?status=error`);

    const item = order.items.id(itemId);
    if (!item) {
        return res.redirect(`/admin/view-order/${order._id}?status=error`);
    }

    item.status = newStatus;

    if(order.items.every(item => item.status === 'Cancelled')){
         order.orderStatus = 'Cancelled'
         const product = await Product.findById(item.productId);
        if (product) {
            product.count += item.quantity;
            await product.save();
        }
    }
       
    else if(order.items.every(item => item.status === 'Delivered')){
        order.orderStatus = 'Delivered'
        const product = await Product.findById(item.productId);
        if (product) {
            product.count += item.quantity;
            await product.save();
        }
    }
        
    else
        order.orderStatus = 'Processing'


    order.statusHistory.push({
        status: newStatus,
        date: new Date(),
        current: true
    });

    order.statusHistory.forEach(h => {
        if (h !== order.statusHistory[order.statusHistory.length - 1]) {
            h.current = false;
        }
    });

    await order.save();

    res.redirect(`/admin/view-order/${order._id}?status=updated`);


}

module.exports = {
    listOrders,
    updateOrderStatus,
    viewOrder,
    updateItemStatus,
}