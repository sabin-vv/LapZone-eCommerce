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

    item.status = 'Cancelled';
    item.cancelDate = new Date();

    const product = item.productId;
    const variant = product.variants.find(v => v.RAM === item.ram && v.Storage === item.storage);
    if (variant) {
      variant.stock += item.quantity;
      await product.save();
    }

    const itemTotal = item.price * item.quantity;
    const originalSubtotal = order.subtotal;
    const originalDiscount = order.discountAmount || 0;

    let refundAmount = 0;
    let refundNote = '';
    let couponDiscountShare = 0;

    const remainingItems = order.items.filter(i => i.status !== 'Cancelled');
    const newSubtotal = remainingItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    const allCancelled = remainingItems.length === 0;

    if (allCancelled) {
      refundAmount = order.totalAmount;

      order.subtotal = 0;
      order.discountAmount = 0;
      order.tax = 0;
      order.shippingFee = 0;
      order.totalAmount = 0;
      order.coupon = null;
      order.orderStatus = 'Cancelled';

      refundNote = ' (full order refund)';
    } else {
      const taxRate = 0.05;
      const newTax = Math.round(newSubtotal * taxRate);
      order.subtotal = newSubtotal;
      order.tax = newTax;

      if (order.coupon && (order.coupon.code || order.coupon)) {
        const couponCode = order.coupon.code || order.coupon;
        const coupon = await Coupon.findOne({
          code: couponCode,
          isActive: true,
          startDate: { $lte: new Date() },
          expiryDate: { $gte: new Date() }
        });

        if (!coupon || newSubtotal < coupon.minPurchaseAmount) {
          order.coupon = null;
          order.discountAmount = 0;
          couponDiscountShare = Math.round((itemTotal / originalSubtotal) * originalDiscount);
          refundNote = ` (₹${couponDiscountShare} deducted from refund as coupon removed)`;
        } else {
          let newDiscount = 0;
          if (coupon.discountType === 'percentage') {
            newDiscount = Math.round((coupon.discountValue / 100) * newSubtotal);
            if (coupon.maxDiscountAmount) {
              newDiscount = Math.min(newDiscount, coupon.maxDiscountAmount);
            }
          } else {
            newDiscount = Math.min(coupon.discountValue, newSubtotal);
          }

          order.discountAmount = newDiscount;
        }
      }

      order.totalAmount = order.subtotal - order.discountAmount + order.shippingFee + order.tax;

      refundAmount = Math.round(itemTotal - couponDiscountShare);
    }

    if (order.paymentStatus === 'Completed' && refundAmount > 0) {
      let wallet = await Wallet.findOne({ userId: order.user });
      if (!wallet) wallet = new Wallet({ userId: order.user, balance: 0, transactions: [] });

      wallet.balance += refundAmount;
      wallet.transactions.push({
        type: 'credit',
        amount: refundAmount,
        description: `Refund for Order #${order.orderId}`,
        date: new Date(),
        createdAt: new Date()
      });

      await wallet.save();
    }

    order.statusHistory.forEach(s => s.current = false);
    order.statusHistory.push({
      status: 'Cancelled',
      date: new Date(),
      current: allCancelled
    });

    await order.save();

    return res.json({
      success: true,
      refundAmount,
      message: `Item cancelled. ₹${refundAmount} refunded${refundNote}.`
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