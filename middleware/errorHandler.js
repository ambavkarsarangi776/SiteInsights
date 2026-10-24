/**
 * Central error handling middleware.
 * Outputs the unified error structure defined in PRD Section 8:
 * { "error": { "code": "...", "message": "..." } }
 */
function errorHandler(err, req, res, next) {
  // If headers have already been sent, delegate to default express error handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || 500;
  const errorCode = err.code || 'SERVER_ERROR';
  const errorMessage = err.message || 'An unexpected server error occurred.';

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: errorMessage
    }
  });
}

module.exports = errorHandler;
