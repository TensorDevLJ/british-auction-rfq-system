/**
 * middleware/errorHandler.js
 */
function errorHandler(err, req, res, next) {
  const status = err.status ?? 500;
  const message = err.message ?? 'Internal server error';

  if (status === 500) {
    console.error('[ERROR]', err);
  }

  return res.status(status).json({
    success: false,
    message,
    statusCode: status,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
