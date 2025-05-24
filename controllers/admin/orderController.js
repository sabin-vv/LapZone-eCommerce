const Order = require("../../model/order")
const Product = (require("../../model/products"))
const Wallet = require("../../model/wallet")




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
            order.items.forEach(item => {
                item.status = 'Cancelled';
            });
        } else if (status === 'Delivered') {
            order.paymentStatus = 'Completed';
            order.items.forEach(item => {
                item.status = 'Delivered';
            });
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

    if (order.items.every(item => item.status === 'Cancelled')) {
        order.orderStatus = 'Cancelled'
        const product = await Product.findById(item.productId);
        if (product) {
            product.count += item.quantity;
            await product.save();
        }
    }

    else if (order.items.every(item => item.status === 'Delivered')) {
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

const cancelReturnRequest = async (req, res) => {

    try {
        if (!req.session.admin) return res.redirect("/admin")

        const returnRequests = await Order.find({
            'items.status': 'Return Requested'
        })
            .populate('user', 'fullname email')
            .populate('items.productId', 'productName images')
            .sort({ 'items.returnRequestDate': -1 });


        const cancelRequests = await Order.find({
            'items.status': 'Cancel Requested'
        })
            .populate('user', 'fullname email')
            .populate('items.productId', 'productName images')
            .sort({ 'items.cancelRequestDate': -1 });

        res.render('admin/returnCancelRequests', {
            returnRequests,
            cancelRequests,
            title: 'Return & Cancel Requests'
        });

    } catch (error) {
        console.error('Error fetching return/cancel requests:', error);
        res.status(500).render('error', {
            message: 'Error loading return/cancel requests'
        });
    }
}

const returnApprove = async (req, res) => {
    try {
        const { orderId, itemId } = req.body;

        const order = await Order.findById(orderId).populate('items.productId')
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        let wallet = await Wallet.findOne({ userId: order.user })

        item.status = 'Returned';
        item.returnDate = new Date();


        order.statusHistory.push({
            status: 'Returned',
            date: new Date(),
            current: false
        });

        if (order.paymentStatus == 'Completed') {
            wallet.balance += order.totalAmount

            wallet.transactions.push({
                type: 'credit',
                amount: refundAmount,
                description: `Refund for Order #${order.orderId}`,
                date: new Date(),
                createdAt: new Date()
            });
            await wallet.save()
        }


        const product = await Product.findById(item.productId._id);
        if (product) {
            product.count += item.quantity;
            await product.save();
        }

        await order.save();

        res.json({
            success: true,
            message: 'Return request approved and stock updated successfully'
        });

    } catch (error) {
        console.error('Error approving return request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


const returnReject = async (req, res) => {
    try {
        const { orderId, itemId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }


        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }


        item.status = 'Delivered';


        item.returnReason = undefined;
        item.returnComment = undefined;
        item.returnRequestDate = undefined;


        order.statusHistory.push({
            status: 'Return Rejected',
            date: new Date(),
            current: false
        });

        await order.save();

        res.json({
            success: true,
            message: 'Return request rejected successfully'
        });

    } catch (error) {
        console.error('Error rejecting return request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


const cancelApprove = async (req, res) => {
    try {
        const { orderId, itemId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }


        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        let wallet = await Wallet.findOne({ userId: order.user })
        if (order.paymentStatus == 'Completed') {
            wallet.balance += order.totalAmount

            wallet.transactions.push({
                type: 'credit',
                amount: refundAmount,
                description: `Refund for Order #${order.orderId}`,
                date: new Date(),
                createdAt: new Date()
            });
            await wallet.save()
        }


        item.status = 'Cancelled';
        item.cancelDate = new Date();


        const allItemsCancelled = order.items.every(item => item.status === 'Cancelled');
        if (allItemsCancelled) {
            order.orderStatus = 'Cancelled';
        }


        order.statusHistory.push({
            status: 'Cancelled',
            date: new Date(),
            current: allItemsCancelled
        });

        await order.save();

        res.json({
            success: true,
            message: 'Cancel request approved successfully'
        });

    } catch (error) {
        console.error('Error approving cancel request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


const cancelReject = async (req, res) => {
    try {
        const { orderId, itemId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }


        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        item.status = order.orderStatus === 'Processing' ? 'Processing' : 'Ordered';


        item.cancelReason = undefined;
        item.cancelComment = undefined;
        item.cancelRequestDate = undefined;


        order.statusHistory.push({
            status: 'Cancel Rejected',
            date: new Date(),
            current: false
        });

        await order.save();

        res.json({
            success: true,
            message: 'Cancel request rejected successfully'
        });

    } catch (error) {
        console.error('Error rejecting cancel request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    listOrders,
    updateOrderStatus,
    viewOrder,
    updateItemStatus,
    cancelReturnRequest,
    returnApprove,
    returnReject,
    cancelApprove,
    cancelReject,

}