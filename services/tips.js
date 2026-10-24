/**
 * Beginner-friendly explanations and prescriptions for PageSpeed audit IDs.
 * Each entry contains:
 * - problem: What is causing the slowdown (in plain English, no unexplained jargon)
 * - fix: How a developer can fix it
 * - example: A concrete, actionable code or tool example
 */
const tips = {
  'render-blocking-resources': {
    problem: 'CSS and JavaScript files in the head of your page stop the browser from displaying content until they finish downloading.',
    fix: 'Add the defer or async attribute to script tags, and inline critical above-the-fold CSS.',
    example: 'Change <script src="app.js"></script> to <script src="app.js" defer></script>.'
  },
  'uses-optimized-images': {
    problem: 'Your images are larger than they need to be, so visitors download extra data.',
    fix: 'Compress images and use modern formats like WebP or AVIF.',
    example: 'Convert hero.jpg (3 MB) to hero.webp using squoosh.app, often 70% smaller.'
  },
  'modern-image-formats': {
    problem: 'Legacy image formats like JPEG and PNG take longer to download than modern compressed formats.',
    fix: 'Serve images in modern WebP or AVIF formats for smaller file sizes without losing visual quality.',
    example: 'Use the <picture> element to serve WebP or AVIF with a JPEG fallback.'
  },
  'uses-responsive-images': {
    problem: 'You are sending full desktop-sized images to mobile screens, wasting bandwidth and slowing down rendering.',
    fix: 'Provide multiple image dimensions and let the browser pick the right size using srcset.',
    example: 'Add srcset="img-400.jpg 400w, img-800.jpg 800w" sizes="(max-width: 600px) 400px, 800px" to your <img>.'
  },
  'offscreen-images': {
    problem: 'Images far down the page (below the fold) are loaded immediately, delaying the content the visitor sees first.',
    fix: 'Lazy-load images so they only download when the user scrolls near them.',
    example: 'Add loading="lazy" to your <img> tag: <img src="footer.jpg" loading="lazy" alt="Footer">.'
  },
  'unused-javascript': {
    problem: 'Your page downloads JavaScript code that is never actually executed on the page.',
    fix: 'Split large script bundles into smaller files and import libraries only where needed.',
    example: 'Instead of importing an entire 500 KB utility library, import only the specific functions you use.'
  },
  'unused-css-rules': {
    problem: 'Your stylesheets include CSS rules that do not style any element on the current page.',
    fix: 'Remove dead CSS rules or split your stylesheet into page-specific CSS files.',
    example: 'Avoid loading an entire CSS framework across every page if only a few utility classes are needed.'
  },
  'uses-text-compression': {
    problem: 'Text files (HTML, CSS, JavaScript) are sent across the network uncompressed.',
    fix: 'Enable Gzip or Brotli compression on your web server or CDN.',
    example: 'In Node/Express, add the compression middleware (app.use(compression())) to shrink responses by up to 70%.'
  },
  'server-response-time': {
    problem: 'Your web server takes too long to respond when a visitor requests the page (high Time to First Byte).',
    fix: 'Optimize database queries, implement server-side caching, or upgrade hosting resources.',
    example: 'Cache expensive database query results in memory with Redis or node-cache.'
  },
  'uses-long-cache-ttl': {
    problem: 'Repeat visitors have to re-download the same unchanged static files every time they visit.',
    fix: 'Set a long Cache-Control max-age header for static assets (images, CSS, JS).',
    example: 'Set header Cache-Control: public, max-age=31536000, immutable for versioned static assets.'
  },
  'dom-size': {
    problem: 'Your webpage has too many HTML elements, which causes high memory usage and slow rendering in the browser.',
    fix: 'Simplify your HTML structure and avoid deeply nested <div> elements.',
    example: 'Use modern CSS Flexbox and Grid to build layouts instead of wrapping elements in 10 layers of <div> tags.'
  },
  'total-byte-weight': {
    problem: 'The combined size of all files on your webpage is very heavy, causing slow loading on mobile and slower connections.',
    fix: 'Audit your heaviest assets, compress large media files, and remove unnecessary third-party scripts.',
    example: 'Aim to keep the total page weight under 1.6 MB for snappy loading on mobile networks.'
  }
};

/**
 * Generic fallback tip for unknown or unlisted audit IDs.
 */
const fallbackTip = {
  problem: 'This performance audit flagged an opportunity to make your page faster.',
  fix: 'Inspect the flagged resources and optimize or defer them to reduce load time.',
  example: 'Check the details in Lighthouse or PageSpeed Insights for specific resource recommendations.'
};

/**
 * Retrieves the beginner-friendly tip for a given audit ID.
 * Returns the fallback tip if the audit ID is unknown.
 *
 * @param {string} auditId
 * @returns {{ problem: string, fix: string, example: string }}
 */
function getTip(auditId) {
  if (auditId && Object.prototype.hasOwnProperty.call(tips, auditId)) {
    return tips[auditId];
  }
  return fallbackTip;
}

module.exports = {
  tips,
  fallbackTip,
  getTip
};
