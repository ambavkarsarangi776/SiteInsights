// Placeholder for errorHandler middleware (Phase 2+)
module.exports = (err, req, res, next) => {
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
};
