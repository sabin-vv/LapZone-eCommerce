const User = require("../../model/user.js")
const bcrypt = require("bcrypt")
const Product = require("../../model/products")
const Order = require("../../model/order")
const puppeteer = require("puppeteer")

const getadminLogin = (req, res, next) => {
    try {
        if (req.session.admin)
            return res.status(200).render("admin/adminDashboard")

        res.status(200).render("admin/adminlogin", { error: null })

    } catch (err) {
        console.error("Error in getadminLogin:", err);
        next(err);
    }
}

const login = async (req, res, next) => {
    try {
        if (req.session.admin)
            return res.status(200).render("admin/adminDashboard")

        const { email, password } = req.body

        if (!email || !password)
            return res.status(400).render("admin/adminlogin", { error: "All Fields re Required" })

        const user = await User.findOne({ email })
        if (!user)
            return res.status(404).render("admin/adminlogin", { error: "Account not Found" })

        if (!user.isAdmin)
            return res.status(403).render("admin/adminlogin", { error: "Unauthorized Access" })

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch)
            return res.status(401).render("admin/adminlogin", { error: "Invalid Credentials" })

        req.session.admin = email
        res.status(302).redirect("/admin/dashboard")
    } catch (error) {
        console.error("Error in login:", error);
        next(error);
    }
}

const adminLogout = (req, res, next) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log("Cannot destroy the Session : ", err)
                return res.status(500).send("Account Logout Failed Due to some Errors")
            }
            res.clearCookie('session-id')
            return res.status(302).redirect("/admin/login")
        })

    } catch (error) {
        console.error("Error in adminLogout:", err);
        next(err);
    }
}

const adminDashbaord = async (req, res, next) => {
    try {
        if (!req.session.admin)
            return res.status(401).render("admin/adminlogin", { error: null })

        const productCount = await Product.countDocuments({ isExisting: true })
        const userCount = await User.countDocuments({ isAdmin: false, isBlocked: { $ne: true } })
        const orderCount = await Order.countDocuments({
            orderStatus: { $nin: ['Cancelled', 'Returned'] },
            paymentStatus: "Completed"
        })
        const sales = await Order.aggregate([
            {
                $match: {
                    orderStatus: { $nin: ['Cancelled', 'Returned'] },
                    paymentStatus: "Completed"
                }
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ])
        const totalSales = Math.round(sales[0]?.total || 0)

        return res.status(200).render("admin/adminDashboard", { productCount, userCount, orderCount, totalSales })

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        next(error);
    }
}

const getDashboardStats = async (req, res, next) => {
    try {
        const sales = await Order.aggregate([
            {
                $match: {
                    orderStatus: { $nin: ['Cancelled', 'Returned'] },
                    paymentStatus: 'Completed'
                }
            },
            { $unwind: "$items" },
            {
                $match: {
                    "items.status": { $ne: "Cancelled" }
                }
            },
            {
                $group: {
                    _id: null,
                    total: {
                        $sum: {
                            $multiply: ["$items.quantity", "$items.price"]
                        }
                    }
                }
            }
        ]);
        const totalSales = sales.length > 0 ? Math.round(sales[0].total) : 0;

        const totalOrders = await Order.countDocuments({
            orderStatus: { $nin: ['Cancelled', 'Returned'] },
            paymentStatus: "Completed"
        });

        const totalCustomers = await User.countDocuments({
            isAdmin: false,
            isBlocked: { $ne: true }
        });

        const totalProducts = await Product.countDocuments({
            isExisting: true
        });

        res.status(200).json({
            totalSales,
            totalOrders,
            totalCustomers,
            totalProducts,
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        next(error);
    }
};

const getSalesData = async (req, res, next) => {
    try {
        const { period } = req.query;
        const now = new Date();
        let labels = [];
        let data = [];

        switch (period) {
            case 'yearly':
                for (let i = 4; i >= 0; i--) {
                    const year = now.getFullYear() - i;
                    labels.push(year.toString());

                    const yearStart = new Date(year, 0, 1);
                    const yearEnd = new Date(year + 1, 0, 1);

                    const orders = await Order.find({
                        createdAt: { $gte: yearStart, $lt: yearEnd },
                        orderStatus: { $nin: ['Cancelled', 'Returned'] },
                        paymentStatus: 'Completed'
                    });

                    const yearSales = orders.reduce((sum, order) => {
                        const validItems = order.items.filter(item => item.status !== 'Cancelled');
                        const orderTotal = validItems.reduce((itemSum, item) => itemSum + (item.quantity * item.price), 0);
                        return sum + orderTotal;
                    }, 0);
                    data.push(yearSales);
                }
                break;

            case 'monthly':
                for (let i = 11; i >= 0; i--) {
                    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    labels.push(date.toLocaleDateString('en-US', { month: 'short' }));

                    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
                    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);

                    const orders = await Order.find({
                        createdAt: { $gte: monthStart, $lt: monthEnd },
                        orderStatus: { $nin: ['Cancelled', 'Returned'] },
                        paymentStatus: 'Completed'
                    });

                    const monthSales = orders.reduce((sum, order) => {
                        const validItems = order.items.filter(item => item.status !== 'Cancelled');
                        const orderTotal = validItems.reduce((itemSum, item) => itemSum + (item.quantity * item.price), 0);
                        return sum + orderTotal;
                    }, 0);
                    data.push(monthSales);
                }
                break;

            case 'weekly':
                for (let i = 3; i >= 0; i--) {
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
                    weekStart.setHours(0, 0, 0, 0);

                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 7);

                    labels.push(`Week ${4 - i}`);

                    const orders = await Order.find({
                        createdAt: { $gte: weekStart, $lt: weekEnd },
                        orderStatus: { $nin: ['Cancelled', 'Returned'] },
                        paymentStatus: 'Completed'
                    });

                    const weekSales = orders.reduce((sum, order) => {
                        const validItems = order.items.filter(item => item.status !== 'Cancelled');
                        const orderTotal = validItems.reduce((itemSum, item) => itemSum + (item.quantity * item.price), 0);
                        return sum + orderTotal;
                    }, 0);
                    data.push(weekSales);
                }
                break;

            case 'daily':
                for (let i = 6; i >= 0; i--) {
                    const date = new Date(now);
                    date.setDate(now.getDate() - i);
                    date.setHours(0, 0, 0, 0);

                    const nextDay = new Date(date);
                    nextDay.setDate(date.getDate() + 1);

                    labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));

                    const orders = await Order.find({
                        createdAt: { $gte: date, $lt: nextDay },
                        orderStatus: { $nin: ['Cancelled', 'Returned'] },
                        paymentStatus: 'Completed'
                    });

                    const daySales = orders.reduce((sum, order) => {
                        const validItems = order.items.filter(item => item.status !== 'Cancelled');
                        const orderTotal = validItems.reduce((itemSum, item) => itemSum + (item.quantity * item.price), 0);
                        return sum + orderTotal;
                    }, 0);
                    data.push(daySales);
                }
                break;

            default:
                return res.status(400).json({ error: 'Invalid period specified' });
        }

        res.status(200).json({ labels, data });

    } catch (error) {
        console.error('Error fetching sales data:', error);
        next(error);
    }
};

const getTopProducts = async (req, res, next) => {
    try {
        const topProducts = await Order.aggregate([
            {
                $match: {
                    orderStatus: { $nin: ['Cancelled', 'Returned'] },
                    paymentStatus: 'Completed'
                }
            },
            { $unwind: '$items' },
            {
                $match: {
                    "items.status": { $ne: "Cancelled" }
                }
            },
            {
                $group: {
                    _id: '$items.productId',
                    name: { $first: '$items.productName' },
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $project: {
                    name: 1,
                    totalQuantity: 1,
                    totalRevenue: 1,
                    brand: { $arrayElemAt: ['$productDetails.brand', 0] },
                    image: { $arrayElemAt: [{ $arrayElemAt: ['$productDetails.images.url', 0] }, 0] }
                }
            }
        ]);

        res.status(200).json(topProducts);

    } catch (error) {
        console.error('Error fetching top products:', error);
        next(error);
    }
};

const getTopCategories = async (req, res, next) => {
    try {
        const topCategories = await Order.aggregate([
            {
                $match: {
                    orderStatus: { $nin: ['Cancelled', 'Returned'] },
                    paymentStatus: 'Completed'
                }
            },
            { $unwind: '$items' },
            { $match: { "items.status": { $ne: "Cancelled" } } },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productDetails.categoryId',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: '$categoryDetails' },
            {
                $group: {
                    _id: '$categoryDetails._id',
                    name: { $first: '$categoryDetails.name' },
                    totalSales: { $sum: '$items.quantity' },
                    totalRevenue: {
                        $sum: {
                            $multiply: ['$items.quantity', '$items.price']
                        }
                    }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
        ]);

        res.status(200).json(topCategories);

    } catch (error) {
        console.error('Error fetching top categories:', error);
        next(error);
    }
};

const getTopBrands = async (req, res, next) => {
    try {
        const topBrands = await Order.aggregate([
            {
                $match: {
                    orderStatus: { $nin: ['Cancelled', 'Returned'] },
                    paymentStatus: 'Completed'
                }
            },
            { $unwind: '$items' },
            {
                $match: {
                    "items.status": { $ne: "Cancelled" }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$productDetails.brand',
                    name: { $first: '$productDetails.brand' },
                    totalSales: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
        ]);

        res.status(200).json(topBrands);

    } catch (error) {
        console.error('Error fetching top brands:', error);
        next(error);
    }
};

const getRecentOrders = async (req, res, next) => {
    try {
        const recentOrders = await Order.find({ 
            orderStatus: { $nin: ['Cancelled', 'Returned'] },
            paymentStatus: 'Completed'
        })
            .populate('user', 'fullname')
            .sort({ createdAt: -1 })
            .limit(10)
            .select('orderId user totalAmount orderStatus orderDate');

        const formattedOrders = recentOrders.map(order => ({
            orderId: order.orderId,
            customerName: order.user.fullname,
            totalAmount: order.totalAmount,
            orderStatus: order.orderStatus,
            orderDate: order.orderDate
        }));

        res.status(200).json(formattedOrders);

    } catch (error) {
        console.error('Error fetching recent orders:', error);
        next(error);
    }
};

const generateLedger = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.body;

        const orders = await Order.find({
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            orderStatus: { $nin: ['Cancelled', 'Returned'] },
            paymentStatus: 'Completed'
        }).populate('user', 'fullname email').sort({ createdAt: -1 });

        const ledgerData = {
            period: { startDate, endDate },
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
            orders: orders.map(order => ({
                orderId: order.orderId,
                customer: order.user.fullname,
                email: order.user.email,
                amount: order.totalAmount,
                status: order.orderStatus,
                date: order.orderDate
            }))
        };

        res.status(200).json({ success: true, data: ledgerData });

    } catch (error) {
        console.error('Error generating ledger:', error);
        next(error);
    }
};

const downloadLedgerCsv = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        const orders = await Order.find({
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            orderStatus: { $nin: ['Cancelled', 'Returned'] },
            paymentStatus: 'Completed'
        }).populate('user', 'fullname email');

        let csvContent = 'Order ID,Customer Name,Email,Amount,Status,Date\n';

        orders.forEach(order => {
            csvContent += `${order.orderId},${order.user.fullname},${order.user.email},${order.totalAmount},${order.orderStatus},${order.orderDate.toISOString().split('T')[0]}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=ledger_${startDate}_to_${endDate}.csv`);
        res.send(csvContent);

    } catch (error) {
        console.error('Error downloading CSV:', error);
        next(error);
    }
};

const downloadLedgerPdf = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        const orders = await Order.find({
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            orderStatus: { $nin: ['Cancelled', 'Returned'] },
            paymentStatus: 'Completed'
        }).populate('user', 'fullname email').sort({ createdAt: -1 });

        // Calculate revenue using item-level calculation (excluding cancelled items)
        const totalRevenue = orders.reduce((sum, order) => {
            const validItems = order.items.filter(item => item.status !== 'Cancelled');
            const orderTotal = validItems.reduce((itemSum, item) => itemSum + (item.quantity * item.price), 0);
            return sum + orderTotal;
        }, 0);

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .total { font-weight: bold; background-color: #e8f4f8; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>LapZone - Ledger Report</h1>
                <p>Period: ${startDate} to ${endDate}</p>
            </div>
            <div class="summary">
                <h3>Summary</h3>
                <p>Total Orders: ${orders.length}</p>
                <p>Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer Name</th>
                        <th>Email</th>
                        <th>Amount (₹)</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td>${order.orderId}</td>
                            <td>${order.user.fullname}</td>
                            <td>${order.user.email}</td>
                            <td>₹${order.totalAmount.toLocaleString('en-IN')}</td>
                            <td>${order.orderStatus}</td>
                            <td>${order.orderDate.toLocaleDateString('en-IN')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
        `;

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({ format: 'A4' });

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=ledger_${startDate}_to_${endDate}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error downloading PDF:', error);
        next(error);
    }
};

const getDashboard = (req, res, next) => {
    try {
        if (req.session.admin)
            return res.redirect("/admin/dashboard")

    } catch (error) {
        console.error('Error fetching dashboard:', error);
        next(error);
    }

}


module.exports = {
    getadminLogin,
    login,
    adminDashbaord,
    getDashboard,
    adminLogout,
    getDashboardStats,
    getSalesData,
    getTopProducts,
    getTopCategories,
    getTopBrands,
    getRecentOrders,
    generateLedger,
    downloadLedgerCsv,
    downloadLedgerPdf
}