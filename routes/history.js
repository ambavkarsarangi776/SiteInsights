const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const memoryStore = require('../services/memoryStore');

/**
 * Normalizes a URL to match stored site records.
 */
function normalizeUrl(rawUrl) {
  try {
    const parsed = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
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
 * GET /api/history
 * Returns scans for a specific site (newest first).
 * If url query param is omitted, returns the latest 20 scans across all sites.
 */
router.get('/history', async (req, res, next) => {
  try {
    const rawUrl = req.query.url;

    if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '') {
      const normalized = normalizeUrl(rawUrl.trim());
      const withSlash = `${normalized}/`;

      const [rows] = await pool.query(
        `SELECT 
          sc.id, 
          sc.strategy, 
          sc.score, 
          sc.lcp_ms, 
          sc.created_at
        FROM scans sc
        JOIN sites s ON sc.site_id = s.id
        WHERE s.url = ? OR s.url = ?
        ORDER BY sc.created_at DESC, sc.id DESC`,
        [normalized, withSlash]
      );

      if (rows && rows.length > 0) {
        return res.status(200).json(rows);
      }
      return res.status(200).json(memoryStore.getHistory(rawUrl));
    }

    // Default: latest 20 scans across all sites
    const [rows] = await pool.query(
      `SELECT 
        sc.id, 
        sc.strategy, 
        sc.score, 
        sc.lcp_ms, 
        sc.created_at,
        s.url
      FROM scans sc
      JOIN sites s ON sc.site_id = s.id
      ORDER BY sc.created_at DESC, sc.id DESC
      LIMIT 20`
    );

    if (rows && rows.length > 0) {
      return res.status(200).json(rows);
    }
    return res.status(200).json(memoryStore.getHistory());
  } catch (err) {
    console.warn('History database notice (serving from local store):', err.message);
    return res.status(200).json(memoryStore.getHistory(req.query.url));
  }
});

/**
 * GET /api/sites
 * Returns sites with total scan counts, most recent score, and last scan timestamp.
 * Uses SQL JOIN and GROUP BY per PRD requirements.
 */
router.get('/sites', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        s.id,
        s.url,
        COUNT(sc.id) AS scanCount,
        (SELECT sc2.score FROM scans sc2 WHERE sc2.site_id = s.id ORDER BY sc2.created_at DESC, sc2.id DESC LIMIT 1) AS lastScore,
        MAX(sc.created_at) AS lastScanAt
      FROM sites s
      JOIN scans sc ON s.id = sc.site_id
      GROUP BY s.id, s.url
      ORDER BY lastScanAt DESC, s.id DESC`
    );

    if (rows && rows.length > 0) {
      const sites = rows.map((r) => ({
        id: r.id,
        url: r.url,
        scanCount: Number(r.scanCount),
        lastScore: r.lastScore !== null && r.lastScore !== undefined ? Number(r.lastScore) : null,
        lastScanAt: r.lastScanAt
      }));
      return res.status(200).json(sites);
    }
    return res.status(200).json(memoryStore.getSites());
  } catch (err) {
    console.warn('Sites database notice (serving from local store):', err.message);
    return res.status(200).json(memoryStore.getSites());
  }
});

module.exports = router;
