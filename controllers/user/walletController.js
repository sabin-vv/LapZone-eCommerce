const Wallet = require("../../model/wallet")
const User = require("../../model/user")

const viewWalletPage = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect("/login")
        }

        const userId = req.session.user

        const user = await User.findById(userId)
        if (!user) {
            return res.redirect("/login")
        }

        let wallet = await Wallet.findOne({ userId })
        if (!wallet) {
            wallet = new Wallet({
                userId: userId,
                balance: 0,
                transactions: []
            })
            await wallet.save()
        }

        return res.render("user/wallet", { wallet: wallet, })

    } catch (error) {
        console.error("Error loading wallet page:", error)
        return res.redirect("/home")
    }
}

const addMoneyToWallet = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Please login first" });
        }

        const userId = req.session.user;
        const { amount, description } = req.body;

        const amountNum = parseFloat(amount);
        if (!amountNum || amountNum < 1 || amountNum > 50000) {
            return res.status(400).json({
                success: false,
                message: "Amount must be between ₹1 and ₹50,000"
            });
        }

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({
                userId,
                balance: 0,
                transactions: []
            });
        }

        const transaction = {
            type: 'credit',
            amount: amountNum,
            description: description || 'Money added to wallet',
            date: new Date()
        };

        wallet.transactions.push(transaction);
        wallet.balance += amountNum;

        await wallet.save();


        if (req.headers['content-type'] === 'application/json' || req.xhr) {
            return res.json({
                success: true,
                message: `₹${amountNum.toLocaleString('en-IN')} added successfully!`,
                newBalance: wallet.balance
            });
        }


        const message = encodeURIComponent(`₹${amountNum.toLocaleString('en-IN')} added successfully!`);
        return res.redirect(`/profile/wallet?success=${message}`);

    } catch (error) {
        console.error("Error adding money to wallet:", error);

        const errorMsg = encodeURIComponent("Something went wrong. Please try again.");

        if (req.headers['content-type'] === 'application/json' || req.xhr) {
            return res.status(500).json({
                success: false,
                message: "Something went wrong. Please try again."
            });
        }

        return res.redirect(`/profile/wallet?error=${errorMsg}`);
    }
}

module.exports = {

    viewWalletPage,
    addMoneyToWallet
}