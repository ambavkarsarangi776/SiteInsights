/**
 * Audit IDs to extract as performance issues.
 * Only included if audit.score !== null && audit.score < 0.9.
 */
const TARGET_AUDIT_IDS = [
  'render-blocking-resources',
  'uses-optimized-images',
  'modern-image-formats',
  'uses-responsive-images',
  'offscreen-images',
  'unused-javascript',
  'unused-css-rules',
  'uses-text-compression',
  'server-response-time',
  'uses-long-cache-ttl',
  'dom-size',
  'total-byte-weight'
];

/**
 * Calculates rating ('good' | 'needs-improvement' | 'poor') based on value and thresholds.
 */
function getRating(value, goodMax, needsImprovementMax) {
  if (value <= goodMax) return 'good';
  if (value <= needsImprovementMax) return 'needs-improvement';
  return 'poor';
}

/**
 * Calculates overall score rating.
 * 90 - 100: 'good'
 * 50 - 89: 'needs-improvement'
 * 0 - 49: 'poor'
 */
function getScoreRating(score) {
  if (score >= 90) return 'good';
  if (score >= 50) return 'needs-improvement';
  return 'poor';
}

/**
 * Parses raw Google PageSpeed JSON into a clean, structured object.
 *
 * @param {object} raw - Raw JSON from PageSpeed API
 * @param {string} strategy - 'mobile' | 'desktop'
 * @returns {object} Clean parsed report
 */
function parseResult(raw, strategy = 'mobile') {
  const lighthouse = raw?.lighthouseResult || {};
  const audits = lighthouse.audits || {};
  const categories = lighthouse.categories || {};

  // Overall Score (0 to 1 converted to 0 to 100)
  const rawScore = categories.performance?.score;
  const score = rawScore !== null && rawScore !== undefined ? Math.round(rawScore * 100) : 0;
  const rating = getScoreRating(score);

  // Core Web Vitals and Metrics
  const fcpValue = Math.round(audits['first-contentful-paint']?.numericValue || 0);
  const lcpValue = Math.round(audits['largest-contentful-paint']?.numericValue || 0);
  const tbtValue = Math.round(audits['total-blocking-time']?.numericValue || 0);
  const clsValue = parseFloat(Number(audits['cumulative-layout-shift']?.numericValue || 0).toFixed(3));
  const speedIndexValue = Math.round(audits['speed-index']?.numericValue || 0);
  const totalBytes = Math.round(audits['total-byte-weight']?.numericValue || 0);

  const metrics = {
    fcp: {
      value: fcpValue,
      rating: getRating(fcpValue, 1800, 3000)
    },
    lcp: {
      value: lcpValue,
      rating: getRating(lcpValue, 2500, 4000)
    },
    tbt: {
      value: tbtValue,
      rating: getRating(tbtValue, 200, 600)
    },
    cls: {
      value: clsValue,
      rating: getRating(clsValue, 0.1, 0.25)
    },
    speedIndex: {
      value: speedIndexValue,
      rating: getRating(speedIndexValue, 3400, 5800)
    }
  };

  // Extract prioritized issues
  const issues = [];
  for (const auditId of TARGET_AUDIT_IDS) {
    const audit = audits[auditId];
    if (audit && audit.score !== null && audit.score !== undefined && audit.score < 0.9) {
      const savingsMs = Math.round(audit.details?.overallSavingsMs || 0);
      issues.push({
        id: auditId,
        title: audit.title || auditId,
        savingsMs,
        displayValue: audit.displayValue || ''
      });
    }
  }

  // Sort issues by savingsMs descending
  issues.sort((a, b) => b.savingsMs - a.savingsMs);

  return {
    url: lighthouse.finalUrl || raw?.id || '',
    strategy,
    score,
    rating,
    metrics,
    totalBytes,
    issues
  };
}

module.exports = {
  parseResult,
  getRating,
  getScoreRating
};
