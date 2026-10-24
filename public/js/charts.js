/**
 * Chart.js visualization utilities for SiteInsight.
 * Uses Chart.js loaded via CDN.
 */

// Track chart instances to destroy before re-rendering
const chartInstances = {};

/**
 * Renders a horizontal bar chart on results page:
 * Compares each timing metric value against its "Good" Core Web Vitals threshold.
 *
 * @param {string|HTMLCanvasElement} canvasTarget - Canvas element or ID
 * @param {object} metrics - metrics object from scan report
 */
function renderMetricsBarChart(canvasTarget, metrics) {
  const canvas = typeof canvasTarget === 'string' ? document.getElementById(canvasTarget) : canvasTarget;
  if (!canvas || typeof Chart === 'undefined') return null;

  if (chartInstances[canvas.id]) {
    chartInstances[canvas.id].destroy();
  }

  const fcpVal = metrics?.fcp?.value || 0;
  const lcpVal = metrics?.lcp?.value || 0;
  const tbtVal = metrics?.tbt?.value || 0;
  const siVal = metrics?.speedIndex?.value || 0;

  const labels = [
    'FCP (First Contentful)',
    'LCP (Largest Contentful)',
    'TBT (Total Blocking)',
    'Speed Index'
  ];

  const actualValues = [fcpVal, lcpVal, tbtVal, siVal];
  const goodThresholds = [1800, 2500, 200, 3400];

  const actualColors = [
    metrics?.fcp?.rating === 'good' ? '#16a34a' : (metrics?.fcp?.rating === 'needs-improvement' ? '#ea580c' : '#dc2626'),
    metrics?.lcp?.rating === 'good' ? '#16a34a' : (metrics?.lcp?.rating === 'needs-improvement' ? '#ea580c' : '#dc2626'),
    metrics?.tbt?.rating === 'good' ? '#16a34a' : (metrics?.tbt?.rating === 'needs-improvement' ? '#ea580c' : '#dc2626'),
    metrics?.speedIndex?.rating === 'good' ? '#16a34a' : (metrics?.speedIndex?.rating === 'needs-improvement' ? '#ea580c' : '#dc2626')
  ];

  const ctx = canvas.getContext('2d');
  chartInstances[canvas.id] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Your Site (ms)',
          data: actualValues,
          backgroundColor: actualColors,
          borderRadius: 6,
          barPercentage: 0.6
        },
        {
          label: 'Good Threshold (ms)',
          data: goodThresholds,
          backgroundColor: 'rgba(22, 163, 74, 0.25)',
          borderColor: '#16a34a',
          borderWidth: 1.5,
          borderRadius: 6,
          barPercentage: 0.6
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 16,
            font: { size: 12, weight: '600' }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => ` ${context.dataset.label}: ${context.raw.toLocaleString()} ms`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Time (Milliseconds - lower is better)'
          },
          grid: { color: '#f1f5f9' }
        },
        y: {
          grid: { display: false }
        }
      }
    }
  });

  return chartInstances[canvas.id];
}

/**
 * Renders a line chart of score over time for a selected site.
 *
 * @param {string|HTMLCanvasElement} canvasTarget - Canvas element or ID
 * @param {Array} historyData - Scans list for the site
 * @param {string} [siteUrl] - Optional site URL label
 */
function renderScoreTrendChart(canvasTarget, historyData, siteUrl = '') {
  const canvas = typeof canvasTarget === 'string' ? document.getElementById(canvasTarget) : canvasTarget;
  if (!canvas || typeof Chart === 'undefined') return null;

  if (chartInstances[canvas.id]) {
    chartInstances[canvas.id].destroy();
  }

  // Sort chronologically (oldest to newest for trend line)
  const chronological = [...historyData].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const labels = chronological.map((item, idx) => {
    if (!item.created_at) return `#${idx + 1}`;
    const d = new Date(item.created_at);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  });

  const scores = chronological.map((item) => Number(item.score));

  const ctx = canvas.getContext('2d');
  chartInstances[canvas.id] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: siteUrl ? `Performance Score: ${siteUrl}` : 'Performance Score Trend',
          data: scores,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { font: { weight: '600' } }
        },
        tooltip: {
          callbacks: {
            label: (context) => ` Score: ${context.raw} / 100`
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          title: {
            display: true,
            text: 'Performance Score (0 - 100)'
          },
          grid: { color: '#f1f5f9' }
        },
        x: {
          title: {
            display: true,
            text: 'Scan Date & Time'
          },
          grid: { display: false }
        }
      }
    }
  });

  return chartInstances[canvas.id];
}
