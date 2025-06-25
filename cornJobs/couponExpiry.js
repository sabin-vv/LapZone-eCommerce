const cron = require('node-cron');
const Coupon = require("../model/coupon");

cron.schedule("*/5 * * * *", async () => {
  try {
    const now = new Date();
    const result = await Coupon.updateMany(
      { expiryDate: { $lt: now }, isActive: true },
      { $set: { isActive: false } }
    );
  } catch (error) {
    console.error("[CRON] Error updating expired coupons:", error);
  }
});

