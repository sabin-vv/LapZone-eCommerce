const Order = require("../../model/order")
const User = require("../../model/user")
const puppeteer = require("puppeteer")
const Wallet = require("../../model/wallet")
const Coupon = require("../../model/coupon")

async function generateInvoicePDF(order) {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // important for some environments
    });
    const page = await browser.newPage();


    const html = `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LapZone Order Invoice</title>
    <link rel="stylesheet" href="/css/invoice.css">
    <style>
        body {
            font-family: 'Roboto', Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            color: #212121;
        }
        .invoice-container {
            width: 100%;
            max-width: 800px;
            margin: 20px auto;
            background-color: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        }
        .invoice-header {
            background-color: #2874f0;
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            display: flex;
            align-items: center;
        }
        .logo span {
            color: #ffd700;
        }
        .thank-you-message {
            background-color: #e8f5e9;
            padding: 10px 20px;
            font-weight: 500;
            border-left: 4px solid #4caf50;
            margin: 10px 0;
        }
        .order-summary {
            background-color: #eff7ff;
            padding: 15px 20px;
            border-bottom: 1px solid #e0e0e0;
        }
        .order-number {
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 5px;
        }
        .order-date {
            color: #757575;
            font-size: 14px;
        }
        .section {
            padding: 15px 20px;
            border-bottom: 1px solid #e0e0e0;
        }
        .section-title {
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 10px;
            color: #2874f0;
        }
        .address-container {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
        }
        .address-box {
            width: 48%;
            margin-bottom: 15px;
        }
        .address-box h3 {
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 5px;
            color: #757575;
        }
        .address-content {
            background-color: #f9f9f9;
            padding: 10px;
            border-radius: 4px;
            font-size: 14px;
            line-height: 1.5;
        }
        .payment-method {
            background-color: #f9f9f9;
            padding: 10px;
            border-radius: 4px;
            margin-top: 5px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .items-table th {
            background-color: #f9f9f9;
            padding: 12px;
            font-weight: 500;
            font-size: 14px;
            color: #757575;
            text-align: center;
        }
        .items-table th.product-name {
            text-align: left;
        }
        .items-table th.product-price,
        .items-table th.quantity-col {
            text-align: center;
        }
        .items-table td {
            padding: 15px 12px;
            border-bottom: 1px solid #eeeeee;
            font-size: 14px;
            text-align: center;
        }
        .items-table td.product-name {
            text-align: left;
        }
        .items-table td.product-price,
        .items-table td.quantity-col {
            text-align: center;
        }
        .product-name {
            width: 45%;
        }
        .quantity-col {
            width: 15%;
        }
        .product-price {
            width: 20%;
        }
        .subtotal-section {
            padding: 15px 20px;
            display: flex;
            justify-content: flex-end;
        }
        .price-details {
            width: 300px;
        }
        .price-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 14px;
        }
        .total-row {
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            font-size: 16px;
            border-top: 1px dashed #e0e0e0;
            margin-top: 10px;
        }
        .delivery-info {
            background-color: #fffde7;
            padding: 15px 20px;
            border-left: 4px solid #fbc02d;
            margin-bottom: 15px;
        }
        .delivery-date {
            font-weight: 500;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            margin-left: 10px;
        }
        .status-delivered {
            background-color: #e8f5e9;
            color: #2e7d32;
        }
        .payment-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
        .payment-completed {
            background-color: #e8f5e9;
            color: #2e7d32;
        }
        .payment-pending {
            background-color: #fff8e1;
            color: #ff8f00;
        }
        .footer {
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #757575;
            background-color: #f5f5f5;
        }
        .contact-info {
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div class="logo">Lap<span>Zone</span></div>
            <div>INVOICE</div>
        </div>

        <div class="order-summary">
            <div class="order-number">Order #<span id="orderId">${order.orderId}</span></div>
            <div class="order-date">Placed on <span id="orderDate">${order.createdAt.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })}</span></div>
        </div>

        <div class="section">
            <div class="section-title">DELIVERY ADDRESS</div>
            <div class="address-container">
                <div class="address-box" style="width: 100%">
                    <div class="address-content">
                        <div id="shippingName">${order.shippingAddress.fullName}</div>
                        <div id="shippingAddress">${order.shippingAddress.addressLine}</div>
                        <div><span id="shippingCity">${order.shippingAddress.city}</span>, <span id="shippingState">${order.shippingAddress.state}</span> <span id="shippingZip">${order.shippingAddress.postCode}</span></div>
                        <div>Phone: <span id="shippingPhone">${order.shippingAddress.phone}</span></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">PAYMENT INFORMATION</div>
            <div id="paymentMethod">${order.paymentMethod}</div>
            <div class="payment-method">
                <div>Payment Method: <span id="paymentMethodText">${order.paymentMethod}</span></div>
                <div>Payment Status: <span id="paymentStatusBadge" class="payment-badge payment-completed">${order.paymentStatus}</span></div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">ORDER DETAILS</div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th class="product-name">Product</th>
                        <th class="quantity-col">Quantity</th>
                        <th class="product-price">Price</th>
                        <th class="product-price">Total</th>
                    </tr>
                </thead>
                <tbody id="itemsTableBody">
                ${order.items.map(item => {
        return `
                    <tr>
                        <td class="product-name">${item.productName}</td>
                        <td class="quantity-col">${item.quantity}</td>
                        <td class="product-price">₹${item.price.toLocaleString('en-IN')}</td>
                        <td class="product-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
                    </tr>
                    `;
    }).join('')}
                </tbody>
            </table>
        </div>

        <div class="subtotal-section">
            <div class="price-details">
                <div class="price-row">
                    <div>Subtotal</div>
                    <div id="subtotal">₹${order.subtotal.toLocaleString('en-IN')}</div>
                </div>
                <div class="price-row">
                    <div>Shipping Fee</div>
                    <div id="shipping">₹${order.shippingFee.toLocaleString('en-IN')}</div>
                </div>
                <div class="price-row">
                    <div>Tax</div>
                    <div id="tax">₹${order.tax.toLocaleString('en-IN')}</div>
                </div>
                <div class="total-row">
                    <div>Total</div>
                    <div id="total">₹${order.totalAmount.toLocaleString('en-IN')}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="delivery-info">
                <div class="section-title" style="margin-top: 0;">DELIVERY INFORMATION</div>
                <div>Delivery Date: <span id="deliveryDate" class="delivery-date">${order.statusHistory[order.statusHistory.length - 1].date.toLocaleString('en-IN')}</span></div>
                <div>Status: <span class="status-badge status-delivered">Delivered</span></div>
            </div>
        </div>

        <div class="footer">
            <div>© 2025 LapZone. All rights reserved.</div>
            <div class="contact-info">
                If you have any questions about this invoice, please contact our customer support at support@lapzone.com
            </div>
        </div>
    </div>
</body>
</html>
  `;


    await page.setContent(html, { waitUntil: 'networkidle0' });


    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });

    await browser.close();
    return pdfBuffer;
}

const viewOrders = async (req, res) => {

    if (!req.session.user) return res.redirect("/")

    const userId = req.session.user
    const user = await User.findById(userId)
    const username = user.fullname

    const orders = await Order.find({ user }).populate('items.productId').sort({ updatedAt: -1 })

    return res.render("user/orderDetails", { orders, user, username })
}

const cancelitem = async (req, res, next) => {
    try {
        const { itemId, reason, comment } = req.body;


        if (!itemId || !reason) {
            return res.status(400).json({ success: false, message: 'Item ID and reason are required' });
        }


        const orderItem = await Order.findOne({
            'items._id': itemId,
            user: req.session.user,
        });

        const item = orderItem.items.find(item => item._id.toString() === itemId)

        if (!item) {
            return res.status(404).json({ success: false, message: 'Order item not found' });
        }


        if (item.status === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'Item is already canceled' });
        }
        if (item.status === 'Shipped' || orderItem.orderStatus === 'Delivered') {
            return res.status(400).json({ success: false, message: 'Cannot cancel shipped or delivered item' });
        }


        item.status = 'Cancel Requested';
        item.cancelReason = reason;
        item.cancelComment = comment || '';
        item.cancelDate = new Date();

        await orderItem.save();



        return res.status(200).json({ success: true, message: 'Item canceled successfully' });
    } catch (error) {
        console.error('Error canceling item:', error);
        next(error);
    }
};

const cancelOrder = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/")

        const { orderId, reason, comment } = req.body

        const order = await Order.findOne({ orderId }).populate('items.productId')
        if (!order)
            return res.json({ success: false, message: "Product not Found" })

        if (order.orderStatus === 'Delivered') {
            return res.json({ success: false, message: 'Cannot cancel delivered order' });
        }
        if (order.orderStatus === 'Cancelled') {
            return res.json({ success: false, message: 'Order is already canceled' });
        }

        for (const item of order.items) {
            item.status = "Cancelled";
            item.cancelReason = reason;
            item.cancelComment = comment;
            item.cancelDate = new Date();

            const product = item.productId;
            const variant = product.variants.find(
                (v) => v.RAM === item.ram && v.Storage === item.storage
            );

            if (variant) {
                variant.stock += item.quantity;
                await product.save();
            }
        }
        const remainingItems = order.items.filter(item => item.status !== 'Cancelled');
        const remainingSubtotal = remainingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const shippingFee = Number(order.shippingFee) || 0;
        const tax = Number(order.tax) || 0;
        const discountAmount = Number(order.discountAmount) || 0;

        if (order.coupon) {
            const coupon = await Coupon.findOne({ code: order.coupon });
            if (coupon && remainingSubtotal < coupon.minPurchaseAmount) {
                order.discountAmount = 0;
                order.coupon = null;
                order.totalAmount = remainingSubtotal + shippingFee + tax;
            } else {
                order.totalAmount = remainingSubtotal - discountAmount + shippingFee + tax;
            }
        } else {
            order.totalAmount = remainingSubtotal + shippingFee + tax;
        }

        if (isNaN(order.totalAmount)) {
            order.totalAmount = 0;
        }

        let refundAmount = 0;
        if (order.paymentStatus === 'Completed') {
            refundAmount = order.totalAmount;

            let wallet = await Wallet.findOne({ userId: order.user });
            if (!wallet) wallet = new Wallet({ userId: order.user, balance: 0, transactions: [] });

            wallet.balance += refundAmount;

            wallet.transactions.push({
                type: 'credit',
                amount: refundAmount,
                description: `Refund for cancelled Order #${order.orderId}`,
                date: new Date(),
                createdAt: new Date()
            });

            await wallet.save();
            order.paymentStatus = 'Cancelled';
        }

        order.orderStatus = 'Cancelled';
        order.statusHistory.push({
            status: 'Cancelled',
            date: new Date(),
            current: true
        });

        await order.save();

        res.json({
            success: true,
            refundAmount,
            message: `Order cancelled successfully${refundAmount ? ` and ₹${refundAmount} refunded to wallet` : ''}.`
        });


    } catch (error) {
        console.error('Error canceling order:', error);
        next(error);
    }

}

const downloadInvoice = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/")

        const orderId = req.params.id

        const order = await Order.findById(orderId).populate('items.productId')

        if (!order) return res.status(404).send('Order not found');

        const pdfBuffer = await generateInvoicePDF(order);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=invoice_${order._id}.pdf`,
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);


    } catch (err) {
        console.error('Invoice generation error:', err);
        next(err);
    }
}

const returnProduct = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/")


        const { itemId, reason, comment } = req.body
        const userId = req.session.user

        if (!reason)
            return res.json({ sucess: false, message: "You should select a Resson" })
        if (reason === 'other' && comment === '')
            return res.json({ success: false, message: "Please Mention the Reason" })

        const user = await User.findById(userId)

        const order = await Order.findOne({ user: userId, 'items._id': itemId })


        if (!order)
            return res.json({ success: false, message: "Order not Found in our Server" })

        const item = order.items.find(item => item._id.toString() === itemId.trim())


        item.status = 'Return Requested'
        item.returnReason = reason
        item.returnComment = comment || null
        item.returnRequestDate = new Date()

        await order.save()

        return res.json({ success: true, message: 'Return Requested successfully' })
    } catch (error) {
        console.error('Error returning product:', error);
        next(error);
    }

}

const returnOrder = async (req, res, next) => {
    try {
        if (!req.session.user) return res.redirect("/");

        const { orderId, reason, comment } = req.body;

        if (!reason) {
            return res.json({ success: false, message: "You must select a reason" });
        }

        if (reason === 'other' && (!comment || comment.trim() === '')) {
            return res.json({ success: false, message: "Please provide a reason in the comment" });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        if (order.orderStatus === 'Cancelled') {
            return res.json({ success: false, message: "Order is already cancelled" });
        }

        const returnableItems = order.items.filter(item => item.status === 'Delivered');
        if (returnableItems.length === 0) {
            return res.json({ success: false, message: "No items are eligible for return" });
        }

        returnableItems.forEach(item => {
            item.status = 'Return Requested';
            item.returnReason = reason;
            item.returnComment = comment || null;
            item.returnRequestDate = new Date();
        });

        order.statusHistory.push({
            status: 'Return Requested',
            date: new Date(),
            current: true
        });

        await order.save();

        return res.json({ success: true, message: "Return request submitted successfully" });

    } catch (error) {
        console.error('Error returning order:', error);
        next(error);
    }
};



module.exports = {
    viewOrders,
    cancelitem,
    cancelOrder,
    downloadInvoice,
    returnProduct,
    returnOrder,

}