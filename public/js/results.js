/**
 * Results page report renderer with Chart.js and Strategy Comparison.
 */

const loadingState = document.getElementById('loading-state');
const reportContent = document.getElementById('report-content');
const errorBanner = document.getElementById('error-banner');
const errorText = document.getElementById('error-text');

let currentReport = null;

function showError(msg) {
  loadingState.classList.add('hidden');
  reportContent.classList.add('hidden');
  errorText.textContent = msg;
  errorBanner.classList.remove('hidden');
}

function formatRatingText(rating) {
  if (rating === 'good') return 'Good';
  if (rating === 'needs-improvement') return 'Needs Improvement';
  return 'Poor';
}

function formatMetricValue(key, value) {
  if (key === 'cls') {
    return Number(value || 0).toFixed(3);
  }
  const num = Number(value || 0);
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)} s (${num.toLocaleString()} ms)`;
  }
  return `${num.toLocaleString()} ms`;
}

function formatDate(isoDate) {
  if (!isoDate) return 'Recently';
  try {
    const d = new Date(isoDate);
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch (_) {
    return isoDate;
  }
}

function renderReport(report) {
  currentReport = report;
  loadingState.classList.add('hidden');
  reportContent.classList.remove('hidden');

  // URL & Metadata
  document.getElementById('report-url').textContent = report.url || 'Website Performance';
  
  const strategy = report.strategy || 'mobile';
  const strategyBadge = document.getElementById('badge-strategy');
  strategyBadge.textContent = strategy === 'desktop' ? '💻 Desktop' : '📱 Mobile';
  strategyBadge.className = `badge badge-${strategy}`;

  const cachedBadge = document.getElementById('badge-cached');
  if (report.cached) {
    cachedBadge.classList.remove('hidden');
  } else {
    cachedBadge.classList.add('hidden');
  }

  document.getElementById('report-date').textContent = formatDate(report.createdAt);

  // Setup Compare Strategy Button
  const compareBtn = document.getElementById('compare-btn');
  const targetOther = strategy === 'mobile' ? 'desktop' : 'mobile';
  compareBtn.textContent = `⚡ Compare with ${targetOther === 'desktop' ? 'Desktop' : 'Mobile'}`;
  compareBtn.onclick = () => runStrategyComparison(targetOther);

  // Score Gauge
  const score = Math.max(0, Math.min(100, Math.round(report.score || 0)));
  const rating = report.rating || 'poor';

  const scoreNumberEl = document.getElementById('score-number');
  scoreNumberEl.textContent = score;

  const gaugeBar = document.getElementById('gauge-bar');
  const circumference = 471.24; // 2 * pi * 75
  const offset = circumference - (circumference * score) / 100;

  let scoreColor = '#dc2626'; // poor (red)
  let verdict = 'Poor Performance';
  let summary = 'This page has severe loading bottlenecks. Visitors on mobile will likely abandon the page.';

  if (rating === 'good') {
    scoreColor = '#16a34a'; // green
    verdict = 'Excellent Performance';
    summary = 'Great job! Your website passes performance best practices and provides a fast experience.';
  } else if (rating === 'needs-improvement') {
    scoreColor = '#ea580c'; // orange
    verdict = 'Needs Improvement';
    summary = 'Your website is usable, but optimization is recommended to prevent delays on mobile connections.';
  }

  scoreNumberEl.style.color = scoreColor;
  gaugeBar.style.stroke = scoreColor;
  gaugeBar.style.strokeDashoffset = offset;

  document.getElementById('score-verdict').textContent = verdict;
  document.getElementById('score-verdict').style.color = scoreColor;
  document.getElementById('score-summary').textContent = summary;

  // Render Horizontal Bar Chart (Task 1)
  try {
    if (typeof renderMetricsBarChart === 'function') {
      renderMetricsBarChart('metrics-bar-chart', report.metrics);
    }
  } catch (chartErr) {
    console.warn('Metrics chart error:', chartErr.message);
  }

  // Render 5 Metric Cards
  const metrics = report.metrics || {};
  const metricConfigs = [
    { key: 'fcp', cardId: 'metric-fcp', valueId: 'fcp-value', pillId: 'fcp-pill' },
    { key: 'lcp', cardId: 'metric-lcp', valueId: 'lcp-value', pillId: 'lcp-pill' },
    { key: 'tbt', cardId: 'metric-tbt', valueId: 'tbt-value', pillId: 'tbt-pill' },
    { key: 'cls', cardId: 'metric-cls', valueId: 'cls-value', pillId: 'cls-pill' },
    { key: 'speedIndex', cardId: 'metric-speedIndex', valueId: 'si-value', pillId: 'si-pill' }
  ];

  for (const cfg of metricConfigs) {
    const data = metrics[cfg.key] || { value: 0, rating: 'poor' };
    const cardEl = document.getElementById(cfg.cardId);
    const valueEl = document.getElementById(cfg.valueId);
    const pillEl = document.getElementById(cfg.pillId);

    if (cardEl && valueEl && pillEl) {
      cardEl.className = `metric-card ${data.rating}`;
      pillEl.className = `metric-rating-pill ${data.rating}`;
      pillEl.textContent = formatRatingText(data.rating);
      valueEl.textContent = formatMetricValue(cfg.key, data.value);
    }
  }

  // Render Issues List
  const issuesList = document.getElementById('issues-list');
  const issuesHeader = document.getElementById('issues-header');
  const issues = report.issues || [];

  issuesList.innerHTML = '';

  if (issues.length === 0) {
    issuesHeader.textContent = "Doctor's Prescriptions (All Clear)";
    issuesList.innerHTML = `
      <div class="empty-state">
        <h3>🎉 No Critical Issues Found!</h3>
        <p>All core performance audits passed with high scores. Your website follows top speed practices.</p>
      </div>
    `;
    return;
  }

  issuesHeader.textContent = `Doctor's Prescriptions (${issues.length} ${issues.length === 1 ? 'Issue' : 'Issues'} to Fix)`;

  issues.forEach((issue) => {
    const card = document.createElement('div');
    card.className = 'issue-card';

    const savingsText = issue.savingsMs > 0
      ? `Save ~${issue.savingsMs.toLocaleString()} ms`
      : (issue.displayValue || 'Optimization Available');

    const tip = issue.tip || {
      problem: 'Performance opportunity flagged by Lighthouse.',
      fix: 'Review this resource and apply standard performance optimization techniques.',
      example: 'Refer to PageSpeed documentation for resource-specific guidance.'
    };

    card.innerHTML = `
      <div class="issue-header">
        <h4 class="issue-title">${escapeHtml(issue.title)}</h4>
        <span class="issue-savings">⚡ ${escapeHtml(savingsText)}</span>
      </div>
      <div class="issue-body">
        <div class="tip-block">
          <span class="tip-label">🚨 Symptom (The Problem)</span>
          <p class="tip-text">${escapeHtml(tip.problem)}</p>
        </div>
        <div class="tip-block">
          <span class="tip-label">💊 Prescription (The Fix)</span>
          <p class="tip-text">${escapeHtml(tip.fix)}</p>
        </div>
        <div class="tip-block tip-example">
          <span class="tip-label">💡 Concrete Example</span>
          <code>${escapeHtml(tip.example)}</code>
        </div>
      </div>
    `;

    issuesList.appendChild(card);
  });
}

/**
 * Executes comparison scan for the alternative strategy (Task 4)
 */
async function runStrategyComparison(otherStrategy) {
  if (!currentReport || !currentReport.url) return;

  const compareBtn = document.getElementById('compare-btn');
  const compareBox = document.getElementById('compare-box');
  const compareStatus = document.getElementById('compare-status');
  const compareGrid = document.getElementById('compare-grid');
  const compareDiff = document.getElementById('compare-diff');

  compareBox.classList.remove('hidden');
  compareGrid.classList.add('hidden');
  compareDiff.classList.add('hidden');
  compareStatus.textContent = `Scanning ${otherStrategy === 'desktop' ? 'Desktop' : 'Mobile'} version (takes ~15-25 seconds)...`;
  compareBtn.disabled = true;

  try {
    const otherReport = await apiScan(currentReport.url, otherStrategy);

    // Populate current vs other
    const curScore = Math.round(currentReport.score || 0);
    const othScore = Math.round(otherReport.score || 0);
    const curStrat = currentReport.strategy || 'mobile';

    document.getElementById('label-current').textContent = curStrat === 'desktop' ? '💻 Desktop' : '📱 Mobile';
    document.getElementById('score-current').textContent = curScore;
    const badgeCur = document.getElementById('badge-current');
    badgeCur.textContent = formatRatingText(currentReport.rating);
    badgeCur.className = `badge ${currentReport.rating}`;

    document.getElementById('label-other').textContent = otherStrategy === 'desktop' ? '💻 Desktop' : '📱 Mobile';
    document.getElementById('score-other').textContent = othScore;
    const badgeOth = document.getElementById('badge-other');
    badgeOth.textContent = formatRatingText(otherReport.rating);
    badgeOth.className = `badge ${otherReport.rating}`;

    // Calculate score difference
    const diff = othScore - curScore;
    const otherName = otherStrategy === 'desktop' ? 'Desktop' : 'Mobile';
    if (diff > 0) {
      compareDiff.textContent = `📈 ${otherName} score is +${diff} points higher`;
      compareDiff.className = 'compare-diff-pill good';
    } else if (diff < 0) {
      compareDiff.textContent = `📉 ${otherName} score is ${diff} points lower`;
      compareDiff.className = 'compare-diff-pill poor';
    } else {
      compareDiff.textContent = `⚖️ Both Mobile and Desktop scored the same (${curScore}/100)`;
      compareDiff.className = 'compare-diff-pill neutral';
    }

    compareStatus.textContent = 'Side-by-side comparison complete:';
    compareGrid.classList.remove('hidden');
    compareDiff.classList.remove('hidden');
    compareBtn.textContent = '✓ Compared';
  } catch (err) {
    compareStatus.textContent = `Could not complete comparison: ${err.message}`;
    compareBtn.disabled = false;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function loadReport() {
  const params = new URLSearchParams(window.location.search);
  const scanId = params.get('id');

  if (scanId) {
    try {
      const report = await apiGetScan(scanId);
      renderReport(report);
      return;
    } catch (err) {
      console.warn('Could not fetch scan from API, checking fallback storage:', err.message);
    }
  }

  // Check sessionStorage fallback
  const cachedScanStr = sessionStorage.getItem('currentScan');
  if (cachedScanStr) {
    try {
      const report = JSON.parse(cachedScanStr);
      renderReport(report);
      return;
    } catch (_) {
      // Invalid JSON
    }
  }

  showError('No scan report found. Please return to the Home page to analyze a website.');
}

window.addEventListener('DOMContentLoaded', loadReport);
