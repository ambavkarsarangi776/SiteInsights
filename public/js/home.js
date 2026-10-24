/**
 * Home page scan interaction and loading state handler.
 */

const scanForm = document.getElementById('scan-form');
const urlInput = document.getElementById('url-input');
const analyzeBtn = document.getElementById('analyze-btn');
const loadingBox = document.getElementById('loading-box');
const loadingMsg = document.getElementById('loading-msg');
const errorBanner = document.getElementById('error-banner');
const errorText = document.getElementById('error-text');

// Rotating loading messages per PRD task 1
const LOADING_MESSAGES = [
  'Connecting to your site...',
  'Measuring load speed...',
  'Checking images and scripts...',
  'Writing your report...'
];

let messageInterval = null;

function showError(message) {
  errorText.textContent = message;
  errorBanner.classList.remove('hidden');
}

function hideError() {
  errorBanner.classList.add('hidden');
  errorText.textContent = '';
}

function startLoading() {
  hideError();
  loadingBox.classList.remove('hidden');
  analyzeBtn.disabled = true;
  urlInput.disabled = true;

  let messageIndex = 0;
  loadingMsg.textContent = LOADING_MESSAGES[0];

  messageInterval = setInterval(() => {
    messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
    loadingMsg.textContent = LOADING_MESSAGES[messageIndex];
  }, 4000);
}

function stopLoading() {
  if (messageInterval) {
    clearInterval(messageInterval);
    messageInterval = null;
  }
  loadingBox.classList.add('hidden');
  analyzeBtn.disabled = false;
  urlInput.disabled = false;
}

scanForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  let url = urlInput.value.trim();
  if (!url) {
    showError('Please enter a website URL to analyze.');
    urlInput.focus();
    return;
  }

  // Prepend https:// if omitted
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
    urlInput.value = url;
  }

  const selectedStrategy = document.querySelector('input[name="strategy"]:checked')?.value || 'mobile';

  startLoading();

  try {
    const report = await apiScan(url, selectedStrategy);

    // Persist full scan data to sessionStorage as an immediate fallback
    sessionStorage.setItem('currentScan', JSON.stringify(report));

    if (report.scanId) {
      window.location.href = `results.html?id=${encodeURIComponent(report.scanId)}`;
    } else {
      window.location.href = 'results.html';
    }
  } catch (err) {
    stopLoading();
    showError(err.message || 'An error occurred during analysis.');
  }
});
