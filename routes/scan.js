require('dotenv').config();
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');

const validateUrl = require('../middleware/validateUrl');
const { runPageSpeed } = require('../services/pagespeed');
const { parseResult } = require('../services/parser');

// Cache configuration: TTL from CACHE_TTL_SECONDS (default 600s / 10m)
const cacheTtlSeconds = parseInt(process.env.CACHE_TTL_SECONDS, 10) || 600;
const scanCache = new NodeCache({ stdTTL: cacheTtlSeconds, checkperiod: 60 });

// Rate limiter: 10 requests per 15 minutes per IP on /api/scan
const scanRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many scan requests from this IP. Please try again after 15 minutes.'
      }
    });
  }
});

/**
 * Normalizes a URL for caching:
 * - Lowercases hostname
 * - Strips URL fragment (#hash)
 * - Removes trailing slash
 *
 * @param {string} rawUrl
 * @returns {string} Normalized URL
 */
function normalizeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.hash = '';
    let normalized = parsed.toString();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch (_) {
    return rawUrl;
  }
}

/**
 * POST /api/scan
 * Analyzes a URL with Google PageSpeed Insights and returns parsed performance data.
 * Protected by rate limiting and in-memory caching.
 */
router.post('/scan', scanRateLimiter, validateUrl, async (req, res, next) => {
  try {
    const { url, strategy } = req.body;
    const normalizedUrl = normalizeUrl(url);
    const cacheKey = `${normalizedUrl}|${strategy}`;

    // Check cache
    const cachedData = scanCache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        ...cachedData,
        cached: true
      });
    }

    // Call Google PageSpeed API
    const rawData = await runPageSpeed(url, strategy);
    const parsed = parseResult(rawData, strategy);
    parsed.cached = false;

    // Cache the parsed result
    scanCache.set(cacheKey, parsed);

    return res.status(200).json(parsed);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
