const express = require('express')
const app = express()
const path = require('path')
const passport = require("./config/passport")
const methodOverride = require('method-override');
const connectDB = require("./config/db")
const userRouter = require("./routes/userRouter")
const adminRouter = require("./routes/adminRouter")
const session = require("express-session")
const nocache = require("nocache")
const counts = require("./middlewares/counts")
const errorHandler = require("./middlewares/errorHandler")
connectDB();
require("dotenv").config()
require("./cornJobs/couponExpiry.js")


app.use(nocache())
app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }))
app.use(express.json());

app.use(methodOverride('_method'));
app.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        const method = req.body._method;
        delete req.body._method;
        return method;
    }
}));

app.use(session({
    secret: process.env.SESSION_SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }

}))

app.use(passport.initialize())
app.use(passport.session())

app.use((req, res, next) => {
    res.locals.user =  req.session.user || null 
    res.locals.username = req.session.username ||null
    next();
});

app.use(counts)

app.use("/", userRouter)
app.use("/admin",adminRouter)

app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.status(404).end();
});

app.get('/favicon.ico', (req, res) => {
    res.status(404).end();
});

app.use('/.well-known', (req, res) => {
    res.status(404).end();
});

app.use((req, res, next) => {
    const error = new Error(`Page not found - ${req.originalUrl}`);
    error.status = 404;
    next(error);
});

app.use(errorHandler);

app.listen(process.env.PORT, () => {
    console.log("server Started")
})