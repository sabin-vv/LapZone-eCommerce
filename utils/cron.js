const cron = require('node-cron');
const Coupon = require('../model/coupon');

// Run every day at midnight
cron.schedule('0 0 * * *', async () => {
  const now = new Date();
  await Coupon.updateMany(
    { expiryDate: { $lt: now }, isActive: true },
    { $set: { isActive: false } }
  );
  console.log('✅ Expired coupons deactivated');
});