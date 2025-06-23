const Order = require("../../model/order")
const Product = (require("../../model/products"))
const Wallet = require("../../model/wallet")
const Coupon = require("../../model/coupon")


const listOrders = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const search = req.query.search?.trim() || "";
        const status = req.query.status || "";
        const payment = req.query.payment || "";
        const dateRange = req.query.date || "";

        const query = {};

        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: "i" } },
                { "user.fullname": { $regex: search, $options: "i" } }
            ];
        }

        if (status) {
            query.orderStatus = { $regex: status, $options: "i" };
        }

        if (payment) {
            query.paymentMethod = { $regex: payment, $options: "i" };
        }

        const now = new Date();
        if (dateRange === "today") {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            query.createdAt = { $gte: start };
        } else if (dateRange === "yesterday") {
            const start = new Date();
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(0, 0, 0, 0);
            query.createdAt = { $gte: start, $lt: end };
        } else if (dateRange === "last7days") {
            const start = new Date();
            start.setDate(start.getDate() - 7);
            query.createdAt = { $gte: start };
        } else if (dateRange === "last30days") {
            const start = new Date();
            start.setDate(start.getDate() - 30);
            query.createdAt = { $gte: start };
        }

        const [orders, totalCount] = await Promise.all([
            Order.find(query)
                .populate("user")
                .populate("items.productId")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Order.countDocuments(query),
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.render("admin/orderList", {
            orders,
            currentPage: page,
            totalPages,
            filters: { search, status, payment, date: dateRange }
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        next(error);
    }
};

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

    const order = await Order.findById(orderId).populate('items.productId');
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (item.status === 'Cancelled') {
      return res.json({ success: true, message: 'Item already cancelled' });
    }

    // Mark item as cancelled
    item.status = 'Cancelled';
    item.cancelDate = new Date();

    // Restock the product variant
    const product = item.productId;
    const variant = product.variants.find(v => v.RAM === item.ram && v.Storage === item.storage);
    if (variant) {
      variant.stock += item.quantity;
      await product.save();
    }

    const activeItems = order.items.filter(i => i.status !== 'Cancelled');
    const itemTotal = item.price * item.quantity;

    const originalSubtotal = order.subtotal || 1; // prevent division by 0
    const originalDiscount = order.discountAmount || 0;
    const shippingFee = order.shippingFee || 0;

    let itemDiscount = 0;
    let refundShipping = activeItems.length === 0 ? shippingFee : 0;
    let updatedDiscount = originalDiscount;
    let couponRemoved = false;
    let refundAmount = 0;
    let couponStillValid = true;

    if (order.coupon?.couponId) {
      const coupon = await Coupon.findById(order.coupon.couponId);

      // Check if coupon is still valid based on new subtotal
      const remainingSubtotal = activeItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

      if (coupon && remainingSubtotal < (coupon.minPurchaseAmount || 0)) {
        const remainingItemsDiscount = (remainingSubtotal / originalSubtotal) * originalDiscount;
        const recoveredDiscount = originalDiscount - remainingItemsDiscount;

        // Subtract the recovered discount from the refund
        refundAmount -= Math.round(recoveredDiscount);

        updatedDiscount = 0;
        couponRemoved = true;
        couponStillValid = false;

        order.coupon = { code: null, couponId: null };
        order.discountAmount = 0;
      }
    }

    // Calculate proportional discount to reduce from refund if coupon still valid
    if (couponStillValid) {
      itemDiscount = (itemTotal / originalSubtotal) * originalDiscount;
    }

    refundAmount += Math.min(itemTotal - itemDiscount + refundShipping);

    // If all items cancelled, refund full amount
    const allCancelled = order.items.every(i => i.status === 'Cancelled');
    if (allCancelled) {
      order.orderStatus = 'Cancelled';
      refundAmount = order.totalAmount;
    } else {
      // Recalculate order values
      const newSubtotal = activeItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const newTax = Math.round(newSubtotal * 0.05);
      const newTotal = newSubtotal + shippingFee + newTax - updatedDiscount;

      order.subtotal = newSubtotal;
      order.tax = newTax;
      order.totalAmount = newTotal;
      order.discountAmount = updatedDiscount;
    }

    // Update status history
    order.statusHistory.forEach(s => s.current = false);
    order.statusHistory.push({
      status: 'Cancelled',
      date: new Date(),
      current: allCancelled
    });

    await order.save();

    // Refund logic (only if paid)
    if (order.paymentStatus === 'Completed' && refundAmount > 0) {
      try {
        let wallet = await Wallet.findOne({ userId: order.user });
        if (!wallet) {
          wallet = new Wallet({ userId: order.user, balance: 0, transactions: [] });
        }

        wallet.balance += refundAmount;
        wallet.transactions.push({
          type: 'credit',
          amount: refundAmount,
          description: `Refund for Order #${order.orderId}`,
          date: new Date(),
          createdAt: new Date()
        });

        await wallet.save();
      } catch (walletErr) {
        console.error("Wallet refund failed:", walletErr);
        return res.status(500).json({
          success: false,
          message: "Refund failed to process in wallet, but item was cancelled.",
        });
      }
    }

    return res.json({
      success: true,
      refundAmount,
      refundShipping,
      couponRemoved,
      message: `Item cancelled. ₹${refundAmount} refunded.`,
    });

  } catch (error) {
    console.error("Error approving cancel request:", error);
    next(error);
  }
};

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