const Order = require("../../model/order")
const Product = (require("../../model/products"))
const Wallet = require("../../model/wallet")


const listOrders = async (req, res, next) => {
    try {
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
    } catch (error) {
        console.error('Error fetching orders:', error);
        next(error);
    }

}

const updateOrderStatus = async (req, res, next) => {
    if (!req.session.admin) return res.redirect("/admin");

    const { orderId, status } = req.body;

    try {
        if (!orderId || !status) {
            return res.status(400).json({ success: false, message: 'Order ID and status are required' });
        }

        const validStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.orderStatus = status;

        order.statusHistory.forEach(history => history.current = false);
        order.statusHistory.push({
            status,
            date: new Date(),
            current: true
        });

        if (status === 'Cancelled' || status === 'Returned') {
            order.paymentStatus = 'Refunded';

            order.items.forEach(item => {
                item.status = status;
            });

            const userId = order.user;
            const refundAmount = order.totalAmount;

            let wallet = await Wallet.findOne({ userId });

            if (!wallet) {
                wallet = new Wallet({
                    userId,
                    balance: refundAmount,
                    transactions: [{
                        type: 'credit',
                        amount: refundAmount,
                        description: `Refund for Order ${order.orderId} (${status})`
                    }]
                });
            } else {
                wallet.balance += refundAmount;
                wallet.transactions.push({
                    type: 'credit',
                    amount: refundAmount,
                    description: `Refund for Order ${order.orderId} (${status})`
                });
            }

            await wallet.save();
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
        next(error);
    }
};

const viewOrder = async (req, res, next) => {
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
        next(error);
    }
};

const updateItemStatus = async (req, res, next) => {
    try {
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
    } catch (error) {
        console.error('Error updating item status:', error);
        next(error);
    }

}

const cancelReturnRequest = async (req, res, next) => {

    try {
        if (!req.session.admin) return res.redirect("/admin")

        const returnRequests = await Order.find({ 'items.status': 'Return Requested' }).populate('user', 'fullname email').populate('items.productId', 'productName images').sort({ 'items.returnRequestDate': -1 });


        const cancelRequests = await Order.find({ 'items.status': 'Cancel Requested' }).populate('user', 'fullname email').populate('items.productId', 'productName images').sort({ 'items.cancelRequestDate': -1 });

        res.render('admin/returnCancelRequests', {
            returnRequests,
            cancelRequests,
            title: 'Return & Cancel Requests'
        });

    } catch (error) {
        console.error('Error fetching return/cancel requests:', error);
        next(error);
    }
}

const returnApprove = async (req, res, next) => {
    try {
        const { orderId, itemId } = req.body;

        const order = await Order.findById(orderId).populate('items.productId');
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const item = order.items.id(itemId);
        if (!item) return res.status(404).json({ error: 'Item not found' });

        if (item.status === 'Returned') {
            return res.json({ success: true, message: 'Item already returned' });
        }

        const subtotal = order.subtotal;
        const totalDiscount = order.discountAmount || 0;
        const totalTax = order.tax;
        const shippingFee = order.shippingFee;

        const itemTotal = item.price * item.quantity;
        const itemDiscount = (itemTotal / subtotal) * totalDiscount;
        const itemTax = (itemTotal / subtotal) * totalTax;

        const eligibleReasons = ['Damaged', 'Wrong Item'];
        const returnReason = item.returnReason || '';
        const activeItems = order.items.filter(i => i._id.toString() !== itemId && i.status !== 'Returned' && i.status !== 'Cancelled');
        const isLastReturnableItem = activeItems.length === 0;

        const refundShipping = eligibleReasons.includes(returnReason) && isLastReturnableItem ? shippingFee : 0;

        const refundAmount = Math.round(itemTotal - itemDiscount + itemTax + refundShipping);

        if (order.paymentStatus === 'Completed') {
            let wallet = await Wallet.findOne({ userId: order.user });
            if (!wallet) wallet = new Wallet({ userId: order.user, balance: 0, transactions: [] });

            wallet.balance += refundAmount;

            wallet.transactions.push({
                type: 'credit',
                amount: refundAmount,
                description: `Refund for returned item in Order #${order.orderId}`,
                date: new Date(),
                createdAt: new Date()
            });

            await wallet.save();
        }

        item.status = 'Returned';
        item.returnDate = new Date();

        const product = await Product.findById(item.productId._id);
        if (product) {
            product.count += item.quantity;
            await product.save();
        }
        const allItemsreturned = order.items.every(item => item.status === 'Returned');
        if (allItemsreturned) {
            order.orderStatus = 'Returned'
        }

        order.statusHistory.push({
            status: 'Returned',
            date: new Date(),
            current: false
        });

        await order.save();

        res.json({
            success: true,
            refundAmount,
            refundShipping,
            message: `Return approved. ₹${refundAmount} refunded to wallet${refundShipping ? ' (includes shipping fee)' : ''}.`
        });

    } catch (error) {
        console.error('Error approving return request:', error);
        next(error);
    }
};

const returnReject = async (req, res, next) => {
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
        next(error);
    }
}

const cancelApprove = async (req, res, next) => {
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

        if (item.status === 'Cancelled') {
            return res.json({
                success: true,
                message: 'Item already cancelled'
            });
        }

        const subtotal = order.subtotal;
        const shippingFee = order.shippingFee;
        const totalTax = order.tax;
        const totalAmount = order.totalAmount
        const totalDiscount = order.discountAmount || 0;

        const itemTotal = item.price * item.quantity

        const itemDiscount = (itemTotal / subtotal) * totalDiscount
        const itemTax = (itemTotal / subtotal) * totalTax;

        const otherActiveItems = order.items.filter(i => i._id.toString() !== itemId && i.status !== 'Cancelled');
        const refundShipping = otherActiveItems.length === 0 ? shippingFee : 0;

        const refundAmount = Math.round(itemTotal - itemDiscount + itemTax + refundShipping);

        item.status = 'Cancelled';
        item.cancelDate = new Date();

        await Product.findByIdAndUpdate(item.productId, { $inc: { count: item.quantity } });


        let wallet = await Wallet.findOne({ userId: order.user })
        if (!wallet) wallet = new Wallet({ userId: order.user, balance: 0, transactions: [] });

        if (order.paymentStatus == 'Completed') {
            wallet.balance += refundAmount

            wallet.transactions.push({
                type: 'credit',
                amount: refundAmount,
                description: `Refund for Order #${order.orderId}`,
                date: new Date(),
                createdAt: new Date()
            });
            await wallet.save()
        }


        await Product.findByIdAndUpdate(itemId,
            {
                $inc: { count: item.quantity }
            });


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
            message: `Cancel request approved successfully. ₹${Math.round(refundAmount)} refunded.`,
            refundAmount: Math.round(refundAmount),
            refundShipping: refundShipping
        });

    } catch (error) {
        console.error('Error approving cancel request:', error);
        next(error);
    }
}

const cancelReject = async (req, res, next) => {
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
        next(error);
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