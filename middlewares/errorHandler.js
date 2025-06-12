module.exports = (err, req, res, next) => {
  console.error("Error :", err.message);
  console.error(err.stack);

  const status = err.status || 500;
  const message = err.message || 'Something went wrong!';

  if (req.originalUrl.startsWith('/admin')) {
    return res.status(status).render('admin/errorPage', {
      wishlistCount: 0,
      cartCount: 0,
      message,
      status,
      error: process.env.NODE_ENV === 'development' ? err.stack : { message: 'Internal Server Error' },
    });
  }else if (req.xhr || req.headers.accept.includes('application/json')) {
    return res.status(status).json({ success: false, message,
      error: process.env.NODE_ENV === 'development' ? err.stack : { message: 'Internal Server Error' }
     });
  }else{
    return res.status(status).render('user/errorPage', {
      wishlistCount: 0,
      cartCount: 0,
      message,
      status,
      error: process.env.NODE_ENV === 'development' ? err.stack : { message: 'Internal Server Error' }
    });
  }

};