const Order = require("../../model/order");

const salesReportPage = async (req, res, next) => {
    if (!req.session.admin) return res.redirect("/admin");

    try {
        const orders = await Order.find({orderStatus: { $nin: ['Cancelled', 'Returned'] }})
            .populate('user', 'fullname email')
            .populate('items.productId', 'productName images')
            .sort({ createdAt: -1 })
            .limit(100); 

        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Order.aggregate([
            { $unwind: "$statusHistory" },
            { $match: { "statusHistory.current": true } },
            {
                $match: {
                "statusHistory.status": { $nin: ["Cancelled", "Returned"] },
                paymentStatus: "Completed"
                }
            },
            {
                $group: {
                _id: null,
                total: { $sum: "$totalAmount" }
                }
            }
            ]);
        const totalDiscount = await Order.aggregate([
            { $group: { _id: null, total: { $sum: "$discountAmount" } } }
        ]);

        res.render("admin/salesReportpage", {
            orders,
            totalOrders,
            totalRevenue: totalRevenue[0]?.total || 0,
            totalDiscount: totalDiscount[0]?.total || 0
        });
    } catch (error) {
        console.error('Error loading sales report page:', error);
        next(error);
    }
};

const getSalesReportData = async (req, res, next) => {
    try {
        const { filterType, startDate, endDate } = req.query;

        let dateFilter = {};
        const now = new Date();

        switch (filterType) {
            case 'daily':
                const startOfDay = new Date(now.setHours(0, 0, 0, 0));
                const endOfDay = new Date(now.setHours(23, 59, 59, 999));
                dateFilter = { createdAt: { $gte: startOfDay, $lte: endOfDay } };
                break;

            case 'weekly':
                const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
                startOfWeek.setHours(0, 0, 0, 0);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(endOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                dateFilter = { createdAt: { $gte: startOfWeek, $lte: endOfWeek } };
                break;

            case 'monthly':
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                dateFilter = { createdAt: { $gte: startOfMonth, $lte: endOfMonth } };
                break;

            case 'yearly':
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                dateFilter = { createdAt: { $gte: startOfYear, $lte: endOfYear } };
                break;

            case 'custom':
                if (startDate && endDate) {
                    const start = new Date(startDate);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    dateFilter = { createdAt: { $gte: start, $lte: end } };
                }
                break;
        }

        const orders = await Order.find(dateFilter)
            .populate('user', 'fullname email')
            .populate('items.productId', 'productName images')
            .sort({ createdAt: -1 });

        const summary = {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
            totalDiscount: orders.reduce((sum, order) => sum + (order.discountAmount || 0), 0),
            totalItems: orders.reduce((sum, order) => sum + order.items.length, 0)
        };

        res.json({
            success: true,
            orders,
            summary
        });

    } catch (error) {
        console.error('Error fetching sales report data:', error);
        next(error);
    }
};

module.exports = {
    salesReportPage,
    getSalesReportData
};