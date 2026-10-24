/**
 * API Fetch Wrapper for Website Speed Doctor.
 * Provides clean error handling and parsed JSON results.
 */

// Human-friendly error messages mapped to API error codes
const ERROR_MESSAGES = {
  INVALID_URL: 'Please enter a valid website URL (e.g. https://example.com). Localhost and private IPs are not allowed.',
  INVALID_STRATEGY: 'Strategy must be either Mobile or Desktop.',
  SITE_UNREACHABLE: 'The requested website could not be reached or analyzed. Please verify that the site is live and accessible.',
  QUOTA_EXCEEDED: 'Google PageSpeed API quota has been reached. Please try again later or configure an API key.',
  TIMEOUT: 'The scan timed out after 60 seconds. The target website may be too slow to respond.',
  NOT_FOUND: 'The requested scan could not be found.',
  RATE_LIMITED: 'You have performed too many scans. Please wait 15 minutes before scanning again.',
  SERVER_ERROR: 'A server error occurred. Please try again.'
};

/**
 * Normalizes API error responses into readable Error instances.
 */
async function handleResponse(response) {
  if (response.ok) {
    return await response.json();
  }

  let errorData = {};
  try {
    errorData = await response.json();
  } catch (_) {
    // Response was not JSON
  }

  const code = errorData.error?.code || 'SERVER_ERROR';
  const customMessage = errorData.error?.message;
  const friendlyMessage = customMessage || ERROR_MESSAGES[code] || 'An unexpected error occurred.';

  const error = new Error(friendlyMessage);
  error.code = code;
  error.status = response.status;
  throw error;
}

/**
 * Calls POST /api/scan to trigger a new performance analysis.
 *
 * @param {string} url - Target URL to analyze
 * @param {string} strategy - 'mobile' | 'desktop'
 * @returns {Promise<object>} Report object
 */
async function apiScan(url, strategy = 'mobile') {
  const response = await fetch('/api/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url, strategy })
  });

  return await handleResponse(response);
}

/**
 * Calls GET /api/scan/:id to fetch a previously saved scan report.
 *
 * @param {number|string} id - Scan record ID
 * @returns {Promise<object>} Report object
 */
async function apiGetScan(id) {
  const response = await fetch(`/api/scan/${encodeURIComponent(id)}`);
  return await handleResponse(response);
}

/**
 * Calls GET /api/history to fetch scan records.
 *
 * @param {string} [url] - Optional target site URL
 * @returns {Promise<Array>} List of scan summaries
 */
async function apiGetHistory(url) {
  const endpoint = url ? `/api/history?url=${encodeURIComponent(url)}` : '/api/history';
  const response = await fetch(endpoint);
  return await handleResponse(response);
}

/**
 * Calls GET /api/sites to fetch all analyzed sites with summaries.
 *
 * @returns {Promise<Array>} List of sites with scan counts and latest scores
 */
async function apiGetSites() {
  const response = await fetch('/api/sites');
  return await handleResponse(response);
}
