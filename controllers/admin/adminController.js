const User = require("../../model/user.js")
const bcrypt = require("bcrypt")
const Product = require("../../model/products")
const Order = require("../../model/order")
const puppeteer = require("puppeteer")

const getadminLogin = (req, res) => {

    if (req.session.admin)
        return res.render("admin/adminDashboard")

    res.render("admin/adminlogin", { error: null })

}

const login = async (req, res) => {

    if (req.session.admin)
        return res.render("admin/adminDashboard")

    const { email, password } = req.body

    if (!email || !password)
        return res.render("admin/adminlogin", { error: "All Fields re Required" })

    const user = await User.findOne({ email })
    if (!user)
        return res.render("admin/adminlogin", { error: "Account not Found" })

    if (!user.isAdmin)
        return res.render("admin/adminlogin", { error: "Unauthorized Access" })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch)
        return res.render("admin/adminlogin", { error: "Invalid Credentials" })

    req.session.admin = email
    res.redirect("/admin/dashboard")
}

const adminLogout = (req, res) => {

    try {

        req.session.destroy(err => {
            if (err) {
                console.log("Cannot destroy the Session : ", err)
                return res.ststus(500).send("Account Logout Failed Due to some Errors")
            }
            res.clearCookie('session-id')
            return res.redirect("/admin/login")
        })

    } catch (error) {

    }


}

const adminDashbaord = async (req, res) => {

    if (!req.session.admin)
        return res.render("admin/adminlogin", { error: null })

    const productCount = await Product.countDocuments()
    const userCount = await User.countDocuments()
    const orderCount = await Order.countDocuments()
    const sales = await Order.aggregate([
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ])
    const totalSales = Math.round(sales[0]?.total)


    return res.render("admin/adminDashboard", { productCount, userCount, orderCount, totalSales })

}

const getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Current month stats
        const currentMonthOrders = await Order.find({
            orderDate: { $gte: startOfMonth },
            orderStatus: { $ne: 'Cancelled' }
        });

        // Last month stats
        const lastMonthOrders = await Order.find({
            orderDate: { $gte: startOfLastMonth, $lte: endOfLastMonth },
            orderStatus: { $ne: 'Cancelled' }
        });

        // Calculate totals
        const totalSales = currentMonthOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        const lastMonthSales = lastMonthOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        
        const totalOrders = await Order.countDocuments({ orderStatus: { $ne: 'Cancelled' } });
        const lastMonthOrdersCount = lastMonthOrders.length;
        
        const totalCustomers = await User.countDocuments({ isAdmin: false });
        const lastMonthCustomers = await User.countDocuments({
            isAdmin: false,
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });
        
        const totalProducts = await Product.countDocuments({ isExisting: true });
        const lastMonthProducts = await Product.countDocuments({
            isExisting: true,
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });

        // Calculate percentage changes
        const salesChange = lastMonthSales > 0 ? 
            ((totalSales - lastMonthSales) / lastMonthSales * 100).toFixed(1) : 0;
        const ordersChange = lastMonthOrdersCount > 0 ? 
            ((currentMonthOrders.length - lastMonthOrdersCount) / lastMonthOrdersCount * 100).toFixed(1) : 0;
        const customersChange = lastMonthCustomers > 0 ? 
            ((totalCustomers - lastMonthCustomers) / lastMonthCustomers * 100).toFixed(1) : 0;
        const productsChange = lastMonthProducts > 0 ? 
            ((totalProducts - lastMonthProducts) / lastMonthProducts * 100).toFixed(1) : 0;

        res.json({
            totalSales,
            totalOrders,
            totalCustomers,
            totalProducts,
            salesChange: parseFloat(salesChange),
            ordersChange: parseFloat(ordersChange),
            customersChange: parseFloat(customersChange),
            productsChange: parseFloat(productsChange)
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
};

// Sales data for charts
const getSalesData = async (req, res) => {
    try {
        const { period } = req.query;
        const now = new Date();
        let labels = [];
        let data = [];

        switch (period) {
            case 'yearly':
                // Get last 5 years
                for (let i = 4; i >= 0; i--) {
                    const year = now.getFullYear() - i;
                    labels.push(year.toString());
                    
                    const yearStart = new Date(year, 0, 1);
                    const yearEnd = new Date(year + 1, 0, 1);
                    
                    const orders = await Order.find({
                        orderDate: { $gte: yearStart, $lt: yearEnd },
                        orderStatus: { $ne: 'Cancelled' }
                    });
                    
                    const yearSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
                    data.push(yearSales);
                }
                break;

            case 'monthly':
                // Get last 12 months
                for (let i = 11; i >= 0; i--) {
                    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
                    
                    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
                    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
                    
                    const orders = await Order.find({
                        orderDate: { $gte: monthStart, $lt: monthEnd },
                        orderStatus: { $ne: 'Cancelled' }
                    });
                    
                    const monthSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
                    data.push(monthSales);
                }
                break;

            case 'weekly':
                // Get last 4 weeks
                for (let i = 3; i >= 0; i--) {
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
                    weekStart.setHours(0, 0, 0, 0);
                    
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 7);
                    
                    labels.push(`Week ${4 - i}`);
                    
                    const orders = await Order.find({
                        orderDate: { $gte: weekStart, $lt: weekEnd },
                        orderStatus: { $ne: 'Cancelled' }
                    });
                    
                    const weekSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
                    data.push(weekSales);
                }
                break;

            case 'daily':
                // Get last 7 days
                for (let i = 6; i >= 0; i--) {
                    const date = new Date(now);
                    date.setDate(now.getDate() - i);
                    date.setHours(0, 0, 0, 0);
                    
                    const nextDay = new Date(date);
                    nextDay.setDate(date.getDate() + 1);
                    
                    labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
                    
                    const orders = await Order.find({
                        orderDate: { $gte: date, $lt: nextDay },
                        orderStatus: { $ne: 'Cancelled' }
                    });
                    
                    const daySales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
                    data.push(daySales);
                }
                break;

            default:
                return res.status(400).json({ error: 'Invalid period specified' });
        }

        res.json({ labels, data });

    } catch (error) {
        console.error('Error fetching sales data:', error);
        res.status(500).json({ error: 'Failed to fetch sales data' });
    }
};

// Top selling products
const getTopProducts = async (req, res) => {
    try {
        const topProducts = await Order.aggregate([
            { $match: { orderStatus: { $ne: 'Cancelled' } } },
            { $unwind: '$items' },
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

        res.json(topProducts);

    } catch (error) {
        console.error('Error fetching top products:', error);
        res.status(500).json({ error: 'Failed to fetch top products' });
    }
};

// Top selling categories
const getTopCategories = async (req, res) => {
    try {
        const topCategories = await Order.aggregate([
            { $match: { orderStatus: { $ne: 'Cancelled' } } },
            { $unwind: '$items' },
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
                    _id: '$productDetails.category',
                    name: { $first: '$productDetails.category' },
                    totalSales: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
        ]);

        res.json(topCategories);

    } catch (error) {
        console.error('Error fetching top categories:', error);
        res.status(500).json({ error: 'Failed to fetch top categories' });
    }
};

// Top selling brands
const getTopBrands = async (req, res) => {
    try {
        const topBrands = await Order.aggregate([
            { $match: { orderStatus: { $ne: 'Cancelled' } } },
            { $unwind: '$items' },
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

        res.json(topBrands);

    } catch (error) {
        console.error('Error fetching top brands:', error);
        res.status(500).json({ error: 'Failed to fetch top brands' });
    }
};

// Recent orders
const getRecentOrders = async (req, res) => {
    try {
        const recentOrders = await Order.find()
            .populate('user', 'fullname')
            .sort({ orderDate: -1 })
            .limit(10)
            .select('orderId user totalAmount orderStatus orderDate');

        const formattedOrders = recentOrders.map(order => ({
            orderId: order.orderId,
            customerName: order.user.fullname,
            totalAmount: order.totalAmount,
            orderStatus: order.orderStatus,
            orderDate: order.orderDate
        }));

        res.json(formattedOrders);

    } catch (error) {
        console.error('Error fetching recent orders:', error);
        res.status(500).json({ error: 'Failed to fetch recent orders' });
    }
};

// Generate ledger
const generateLedger = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        
        const orders = await Order.find({
            orderDate: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).populate('user', 'fullname email');

        // Process ledger data
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

        res.json({ success: true, data: ledgerData });

    } catch (error) {
        console.error('Error generating ledger:', error);
        res.status(500).json({ error: 'Failed to generate ledger' });
    }
};

// Download ledger as CSV
const downloadLedgerCsv = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const orders = await Order.find({
            orderDate: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).populate('user', 'fullname email');

        // Create CSV content
        let csvContent = 'Order ID,Customer Name,Email,Amount,Status,Date\n';
        
        orders.forEach(order => {
            csvContent += `${order.orderId},${order.user.fullname},${order.user.email},${order.totalAmount},${order.orderStatus},${order.orderDate.toISOString().split('T')[0]}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=ledger_${startDate}_to_${endDate}.csv`);
        res.send(csvContent);

    } catch (error) {
        console.error('Error downloading CSV:', error);
        res.status(500).json({ error: 'Failed to download CSV' });
    }
};

// Download ledger as PDF (basic implementation)
// Download ledger as PDF - Fixed version
const downloadLedgerPdf = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const orders = await Order.find({
            orderDate: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).populate('user', 'fullname email');

        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

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
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
};

const getDashboard = (req, res) => {

    if (req.session.admin)
        return res.redirect("/admin/dashboard")

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