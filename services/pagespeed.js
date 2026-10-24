require('dotenv').config();

/**
 * Calls Google PageSpeed Insights API v5 with a 60-second timeout.
 * Maps HTTP and network errors to standard PRD error codes.
 *
 * @param {string} url - Target website URL to analyze
 * @param {string} strategy - 'mobile' | 'desktop'
 * @returns {Promise<object>} Raw JSON response from PageSpeed API
 */
async function runPageSpeed(url, strategy = 'mobile') {
  const apiKey = process.env.PAGESPEED_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_google_api_key_here') {
    const error = new Error('Google PageSpeed API key is missing. Please set PAGESPEED_API_KEY in your .env file.');
    error.status = 500;
    error.code = 'SERVER_ERROR';
    throw error;
  }

  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('strategy', strategy);
  endpoint.searchParams.set('category', 'performance');
  endpoint.searchParams.set('key', apiKey.trim());

  const controller = new AbortController();
  const timeoutMs = 60000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint.toString(), {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorBody = {};
      try {
        errorBody = await response.json();
      } catch (_) {
        // response was not JSON
      }

      const status = response.status;
      const apiMessage = errorBody.error?.message || '';

      if (status === 429) {
        const err = new Error('PageSpeed API quota exceeded. Please try again later.');
        err.status = 429;
        err.code = 'QUOTA_EXCEEDED';
        throw err;
      }

      if (status === 400) {
        // Check if error is due to an invalid API key
        if (/api\s*key/i.test(apiMessage)) {
          const err = new Error('Invalid Google PageSpeed API key. Please check your .env configuration.');
          err.status = 500;
          err.code = 'SERVER_ERROR';
          throw err;
        }

        // Otherwise it's an unreachable / invalid site or Lighthouse run failure
        const err = new Error('The target site could not be reached or analyzed. Please check the URL.');
        err.status = 400;
        err.code = 'SITE_UNREACHABLE';
        throw err;
      }

      if (status >= 500) {
        const err = new Error('Google PageSpeed service encountered a server error. Please try again later.');
        err.status = 502;
        err.code = 'SERVER_ERROR';
        throw err;
      }

      const err = new Error(apiMessage || 'Failed to fetch PageSpeed results.');
      err.status = status;
      err.code = 'SERVER_ERROR';
      throw err;
    }

    const data = await response.json();
    return data;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      const timeoutError = new Error('The scan timed out after 60 seconds.');
      timeoutError.status = 504;
      timeoutError.code = 'TIMEOUT';
      throw timeoutError;
    }

    // Re-throw already mapped errors
    if (err.code) {
      throw err;
    }

    // Network or other fetch errors
    const networkError = new Error('Unable to connect to Google PageSpeed service.');
    networkError.status = 503;
    networkError.code = 'SITE_UNREACHABLE';
    throw networkError;
  }
}

module.exports = { runPageSpeed };
