const passport = require("passport")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require("dotenv").config()
const User = require("../model/user")

function generateReferralCode() {
    const char = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += char.charAt(Math.floor(Math.random() * char.length));
    }
    return code;
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/callback"
},
    async function (accessToken, refreshToken, profile, done) {
        try {
            let user = await User.findOne({ googleId: profile.id })
            
            if (user) {
                if (user.isBlocked) {
                    return done(null, false, { message: "User is Blocked" })
                }
                return done(null, user)
            } else {
                const existingUser = await User.findOne({ email: profile.emails[0].value })
                if (existingUser) {
                    if (existingUser.isBlocked) {
                        return done(null, false, { message: "User is Blocked" })
                    }
                    existingUser.googleId = profile.id
                    await existingUser.save()
                    return done(null, existingUser)
                }
                
                user = new User({
                    fullname: profile.displayName,
                    email: profile.emails[0].value,
                    googleId: profile.id,
                    referralCode: generateReferralCode()
                })
                await user.save()
                return done(null, user)
            }
        } catch (error) {
            return done(error, null)
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => {
            done(null, user)
        }).catch(err => {
            done(err, null)
        })
})

module.exports = passport