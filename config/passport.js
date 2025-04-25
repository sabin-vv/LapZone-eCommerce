const passport = require("passport")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require("dotenv").config()
const User = require("../model/user")

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
},
    async function (accessToken, refreshToken, profile, done) {
        let user = await User.findOne({ googleId: profile.id })
        if (user) {
           return  done(null, user)
        } else {
            user = new User({
                fullname: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id
            })
            await user.save()
            return done(null,user)
        }
    }
));

passport.serializeUser((user,done) =>{
    done(null,user.id)
})

passport.deserializeUser((id,done) => {
    User.findById(id)
    .then(user =>{
        done(null,user)
    }).catch(err => {
        done(err,null)
    })
})

module.exports = passport