const fs = require('fs');
const path = require('path');
const { getRating, getScoreRating } = require('./parser');

const dataDir = path.join(__dirname, '../data');
const dataFilePath = path.join(dataDir, 'local_history.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (_) {}
}

let store = {
  nextScanId: 1,
  sites: {}, // key: normalizedUrl -> { id, url, scanCount, lastScore, lastScanAt }
  scans: []  // array of scan objects
};

// Load existing data from file if available
try {
  if (fs.existsSync(dataFilePath)) {
    const raw = fs.readFileSync(dataFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.scans)) {
      store = parsed;
    }
  }
} catch (err) {
  console.warn('MemoryStore initialization warning:', err.message);
}

function persist() {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.warn('MemoryStore persist warning:', err.message);
  }
}

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
 * Saves a scan into memory/file store.
 */
function saveScan(rawUrl, strategy, parsedReport) {
  const normalized = normalizeUrl(rawUrl);
  const now = new Date().toISOString();
  const scanId = store.nextScanId++;

  // Update site
  if (!store.sites[normalized]) {
    store.sites[normalized] = {
      id: Object.keys(store.sites).length + 1,
      url: normalized,
      scanCount: 0,
      lastScore: parsedReport.score,
      lastScanAt: now
    };
  }
  store.sites[normalized].scanCount += 1;
  store.sites[normalized].lastScore = parsedReport.score;
  store.sites[normalized].lastScanAt = now;

  const scanRecord = {
    id: scanId,
    site_id: store.sites[normalized].id,
    url: normalized,
    strategy: strategy || 'mobile',
    score: parsedReport.score,
    fcp_ms: parsedReport.metrics?.fcp?.value || 0,
    lcp_ms: parsedReport.metrics?.lcp?.value || 0,
    tbt_ms: parsedReport.metrics?.tbt?.value || 0,
    cls: parsedReport.metrics?.cls?.value || 0,
    speed_index_ms: parsedReport.metrics?.speedIndex?.value || 0,
    total_bytes: parsedReport.totalBytes || 0,
    issues: parsedReport.issues || [],
    created_at: now
  };

  store.scans.unshift(scanRecord);
  persist();

  return scanRecord;
}

/**
 * Returns all sites with scan counts and latest scores.
 */
function getSites() {
  return Object.values(store.sites)
    .sort((a, b) => new Date(b.lastScanAt) - new Date(a.lastScanAt));
}

/**
 * Returns scans for a specific site or latest 20 scans across all sites.
 */
function getHistory(rawUrl) {
  if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '') {
    const normalized = normalizeUrl(rawUrl.trim());
    return store.scans
      .filter((s) => s.url === normalized || s.url === `${normalized}/`)
      .map((s) => ({
        id: s.id,
        strategy: s.strategy,
        score: s.score,
        lcp_ms: s.lcp_ms,
        created_at: s.created_at
      }));
  }

  return store.scans.slice(0, 20).map((s) => ({
    id: s.id,
    strategy: s.strategy,
    score: s.score,
    lcp_ms: s.lcp_ms,
    created_at: s.created_at,
    url: s.url
  }));
}

/**
 * Returns a full formatted report for a specific scan ID.
 */
function getScanById(scanId) {
  const numId = parseInt(scanId, 10);
  const scan = store.scans.find((s) => s.id === numId);
  if (!scan) return null;

  const clsValue = parseFloat(Number(scan.cls || 0).toFixed(3));

  return {
    scanId: scan.id,
    url: scan.url,
    strategy: scan.strategy,
    score: scan.score,
    rating: getScoreRating(scan.score),
    metrics: {
      fcp: {
        value: scan.fcp_ms,
        rating: getRating(scan.fcp_ms, 1800, 3000)
      },
      lcp: {
        value: scan.lcp_ms,
        rating: getRating(scan.lcp_ms, 2500, 4000)
      },
      tbt: {
        value: scan.tbt_ms,
        rating: getRating(scan.tbt_ms, 200, 600)
      },
      cls: {
        value: clsValue,
        rating: getRating(clsValue, 0.1, 0.25)
      },
      speedIndex: {
        value: scan.speed_index_ms,
        rating: getRating(scan.speed_index_ms, 3400, 5800)
      }
    },
    totalBytes: scan.total_bytes,
    issues: scan.issues || [],
    cached: false,
    createdAt: scan.created_at
  };
}

module.exports = {
  saveScan,
  getSites,
  getHistory,
  getScanById
};
