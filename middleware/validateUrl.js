const validator = require('validator');

/**
 * Validates request URL and strategy for PageSpeed scan.
 * - Auto-prepends https:// if protocol is omitted
 * - Validates http/https using validator.isURL
 * - Rejects localhost and private IP addresses
 * - Defaults strategy to 'mobile' and validates it is 'mobile' or 'desktop'
 */
function validateUrl(req, res, next) {
  let { url, strategy } = req.body || {};

  if (!url || typeof url !== 'string' || url.trim() === '') {
    return res.status(400).json({
      error: {
        code: 'INVALID_URL',
        message: 'Please enter a valid http or https URL.'
      }
    });
  }

  url = url.trim();

  // Prepend https:// if protocol is omitted
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  // Validate URL structure using validator
  if (!validator.isURL(url, { require_protocol: true, protocols: ['http', 'https'] })) {
    return res.status(400).json({
      error: {
        code: 'INVALID_URL',
        message: 'Please enter a valid http or https URL.'
      }
    });
  }

  // Check for localhost or private IP ranges
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Check localhost
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]'
    ) {
      return res.status(400).json({
        error: {
          code: 'INVALID_URL',
          message: 'Localhost URLs are not allowed.'
        }
      });
    }

    // Check private IPv4 ranges (10.x, 192.168.x, 172.16-31.x, 127.x, 169.254.x, 0.x)
    const privateIpRegex = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3}|0\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
    if (privateIpRegex.test(hostname)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_URL',
          message: 'Private IP addresses are not allowed.'
        }
      });
    }
  } catch (err) {
    return res.status(400).json({
      error: {
        code: 'INVALID_URL',
        message: 'Please enter a valid http or https URL.'
      }
    });
  }

  // Strategy validation: default to 'mobile'
  if (!strategy) {
    strategy = 'mobile';
  } else if (strategy !== 'mobile' && strategy !== 'desktop') {
    return res.status(400).json({
      error: {
        code: 'INVALID_STRATEGY',
        message: "Strategy must be either 'mobile' or 'desktop'."
      }
    });
  }

  // Attach sanitized values back to req.body
  req.body.url = url;
  req.body.strategy = strategy;

  next();
}

module.exports = validateUrl;
