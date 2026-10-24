require('dotenv').config();
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');

const pool = require('../config/db');
const validateUrl = require('../middleware/validateUrl');
const { runPageSpeed } = require('../services/pagespeed');
const { parseResult, getRating, getScoreRating } = require('../services/parser');
const memoryStore = require('../services/memoryStore');

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
 * Analyzes a URL with Google PageSpeed Insights, saves to MySQL, and returns performance report.
 * Protected by rate limiting and in-memory caching.
 */
router.post('/scan', scanRateLimiter, validateUrl, async (req, res, next) => {
  try {
    const { url, strategy } = req.body;
    const normalizedUrl = normalizeUrl(url);
    const cacheKey = `${normalizedUrl}|${strategy}`;

    // Check cache: do not insert into DB on cache hit
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
    parsed.scanId = null;
    parsed.createdAt = new Date().toISOString();

    // Persist to MySQL (upsert site, then insert scan) with resilient fallback
    try {
      const [siteResult] = await pool.query(
        'INSERT INTO sites (url) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
        [normalizedUrl]
      );
      const siteId = siteResult.insertId;

      const [scanResult] = await pool.query(
        `INSERT INTO scans (
          site_id, strategy, score, fcp_ms, lcp_ms, tbt_ms, cls, speed_index_ms, total_bytes, issues_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          siteId,
          strategy,
          parsed.score,
          parsed.metrics.fcp.value,
          parsed.metrics.lcp.value,
          parsed.metrics.tbt.value,
          parsed.metrics.cls.value,
          parsed.metrics.speedIndex.value,
          parsed.totalBytes,
          JSON.stringify(parsed.issues)
        ]
      );

      parsed.scanId = scanResult.insertId;
      // Fetch precise created_at from database row
      const [insertedRow] = await pool.query('SELECT created_at FROM scans WHERE id = ?', [parsed.scanId]);
      if (insertedRow && insertedRow.length > 0) {
        parsed.createdAt = insertedRow[0].created_at;
      }
    } catch (dbErr) {
      console.warn('Database persistence notice (saving to local store):', dbErr.message);
      const fallbackScan = memoryStore.saveScan(normalizedUrl, strategy, parsed);
      parsed.scanId = fallbackScan.id;
      parsed.createdAt = fallbackScan.created_at;
    }

    // Also mirror to memoryStore so history remains instantly accessible
    if (!parsed.scanId) {
      const fallbackScan = memoryStore.saveScan(normalizedUrl, strategy, parsed);
      parsed.scanId = fallbackScan.id;
      parsed.createdAt = fallbackScan.created_at;
    } else {
      memoryStore.saveScan(normalizedUrl, strategy, parsed);
    }

    // Cache the fresh result (with scanId and createdAt)
    scanCache.set(cacheKey, parsed);

    return res.status(200).json(parsed);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/scan/:id
 * Retrieves a single saved scan from MySQL by ID.
 * Returns 404 NOT_FOUND if missing.
 */
router.get('/scan/:id', async (req, res, next) => {
  try {
    const scanId = parseInt(req.params.id, 10);
    if (isNaN(scanId) || scanId <= 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Scan not found.'
        }
      });
    }

    let rows = [];
    try {
      const [dbRows] = await pool.query(
        `SELECT 
          sc.id AS scanId,
          s.url,
          sc.strategy,
          sc.score,
          sc.fcp_ms,
          sc.lcp_ms,
          sc.tbt_ms,
          sc.cls,
          sc.speed_index_ms,
          sc.total_bytes,
          sc.issues_json,
          sc.created_at AS createdAt
        FROM scans sc
        JOIN sites s ON sc.site_id = s.id
        WHERE sc.id = ?`,
        [scanId]
      );
      rows = dbRows;
    } catch (dbErr) {
      console.warn('Scan retrieval DB warning (falling back to memoryStore):', dbErr.message);
    }

    if (!rows || rows.length === 0) {
      const fallback = memoryStore.getScanById(scanId);
      if (fallback) {
        return res.status(200).json(fallback);
      }
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Scan not found.'
        }
      });
    }

    const row = rows[0];
    const score = row.score;
    const rating = getScoreRating(score);

    let issues = [];
    try {
      issues = typeof row.issues_json === 'string' ? JSON.parse(row.issues_json) : (row.issues_json || []);
    } catch (_) {
      issues = [];
    }

    const clsValue = parseFloat(Number(row.cls || 0).toFixed(3));

    const result = {
      scanId: row.scanId,
      url: row.url,
      strategy: row.strategy,
      score,
      rating,
      metrics: {
        fcp: {
          value: row.fcp_ms,
          rating: getRating(row.fcp_ms, 1800, 3000)
        },
        lcp: {
          value: row.lcp_ms,
          rating: getRating(row.lcp_ms, 2500, 4000)
        },
        tbt: {
          value: row.tbt_ms,
          rating: getRating(row.tbt_ms, 200, 600)
        },
        cls: {
          value: clsValue,
          rating: getRating(clsValue, 0.1, 0.25)
        },
        speedIndex: {
          value: row.speed_index_ms,
          rating: getRating(row.speed_index_ms, 3400, 5800)
        }
      },
      totalBytes: row.total_bytes,
      issues,
      cached: false,
      createdAt: row.createdAt
    };

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
