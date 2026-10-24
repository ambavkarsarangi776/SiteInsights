const express = require('express');
const router = express.Router();
const validateUrl = require('../middleware/validateUrl');
const { runPageSpeed } = require('../services/pagespeed');
const { parseResult } = require('../services/parser');

/**
 * POST /api/scan
 * Analyzes a URL with Google PageSpeed Insights and returns parsed performance data.
 */
router.post('/scan', validateUrl, async (req, res, next) => {
  try {
    const { url, strategy } = req.body;
    const rawData = await runPageSpeed(url, strategy);
    const parsed = parseResult(rawData, strategy);
    res.status(200).json(parsed);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
