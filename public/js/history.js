/**
 * History page logic: Loads analyzed sites and score trend charts.
 */

const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const historyContent = document.getElementById('history-content');
const errorBanner = document.getElementById('error-banner');
const errorText = document.getElementById('error-text');

const sitesTbody = document.getElementById('sites-tbody');
const siteDetailSection = document.getElementById('site-detail-section');
const selectedSiteTitle = document.getElementById('selected-site-title');
const selectedSiteSub = document.getElementById('selected-site-sub');
const scansTbody = document.getElementById('scans-tbody');
const closeDetailBtn = document.getElementById('close-detail-btn');

let currentSelectedUrl = null;

function showError(msg) {
  loadingState.classList.add('hidden');
  errorText.textContent = msg;
  errorBanner.classList.remove('hidden');
}

function formatDate(isoDate) {
  if (!isoDate) return 'N/A';
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

function getScoreRating(score) {
  const num = Number(score);
  if (num >= 90) return 'excellent';
  if (num >= 70) return 'good';
  if (num >= 50) return 'needs-work';
  return 'poor';
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

async function loadSites() {
  loadingState.classList.remove('hidden');
  errorBanner.classList.add('hidden');
  emptyState.classList.add('hidden');
  historyContent.classList.add('hidden');

  try {
    const sites = await apiGetSites();

    loadingState.classList.add('hidden');

    if (!sites || sites.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    historyContent.classList.remove('hidden');
    sitesTbody.innerHTML = '';

    sites.forEach((site) => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';

      const scoreNum = site.lastScore !== null ? Number(site.lastScore) : null;
      const scoreRating = scoreNum !== null ? getScoreRating(scoreNum) : 'poor';
      const scoreBadgeHtml = scoreNum !== null
        ? `<span class="score-pill ${scoreRating}">${scoreNum} / 100</span>`
        : `<span class="text-muted">--</span>`;

      tr.innerHTML = `
        <td class="font-medium">
          <a href="${escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer" class="site-link">
            ${escapeHtml(site.url)}
          </a>
        </td>
        <td><strong>${site.scanCount || 0}</strong></td>
        <td>${scoreBadgeHtml}</td>
        <td>${formatDate(site.lastScanAt)}</td>
        <td>
          <button class="btn-secondary btn-sm select-btn">View Trend & Scans</button>
        </td>
      `;

      tr.addEventListener('click', (e) => {
        // Prevent opening link from intercepting click
        if (e.target.tagName.toLowerCase() === 'a') return;
        selectSite(site.url, tr);
      });

      sitesTbody.appendChild(tr);
    });

    // Auto-select the first site by default for great UX
    if (sites.length > 0) {
      selectSite(sites[0].url, sitesTbody.firstElementChild);
    }
  } catch (err) {
    showError(err.message || 'Failed to retrieve site history.');
  }
}

async function selectSite(url, rowElement) {
  currentSelectedUrl = url;

  // Highlight active row in table
  document.querySelectorAll('#sites-tbody tr').forEach((r) => r.classList.remove('selected-row'));
  if (rowElement) {
    rowElement.classList.add('selected-row');
  }

  siteDetailSection.classList.remove('hidden');
  selectedSiteTitle.textContent = `Score Trend: ${url}`;
  selectedSiteSub.textContent = 'Loading scans and rendering trend chart...';
  scansTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">Loading scan history...</td></tr>';

  // Smooth scroll down to chart section on mobile
  if (window.innerWidth < 768) {
    siteDetailSection.scrollIntoView({ behavior: 'smooth' });
  }

  try {
    const scans = await apiGetHistory(url);

    selectedSiteSub.textContent = `Displaying ${scans.length} historical ${scans.length === 1 ? 'scan' : 'scans'}`;
    scansTbody.innerHTML = '';

    if (!scans || scans.length === 0) {
      scansTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 1.5rem;">No scans recorded for this site.</td></tr>';
      return;
    }

    // Render Line Chart via charts.js
    if (typeof renderScoreTrendChart === 'function') {
      renderScoreTrendChart('score-trend-chart', scans, url);
    }

    // Populate past scans table
    scans.forEach((scan) => {
      const scoreNum = Number(scan.score || 0);
      const scoreRating = getScoreRating(scoreNum);
      const strategyText = scan.strategy === 'desktop' ? '💻 Desktop' : '📱 Mobile';
      const lcpFormatted = scan.lcp_ms !== null ? `${Number(scan.lcp_ms).toLocaleString()} ms` : '--';

      const scanRow = document.createElement('tr');
      scanRow.innerHTML = `
        <td>#${scan.id}</td>
        <td><span class="badge badge-${scan.strategy}">${strategyText}</span></td>
        <td><span class="score-pill ${scoreRating}">${scoreNum} / 100</span></td>
        <td>${lcpFormatted}</td>
        <td>${formatDate(scan.created_at)}</td>
        <td>
          <a href="results.html?id=${encodeURIComponent(scan.id)}" class="table-link">
            View Report →
          </a>
        </td>
      `;
      scansTbody.appendChild(scanRow);
    });
  } catch (err) {
    selectedSiteSub.textContent = `Failed to load scans: ${err.message}`;
    scansTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--score-poor); padding: 1.5rem;">${escapeHtml(err.message)}</td></tr>`;
  }
}

closeDetailBtn.addEventListener('click', () => {
  siteDetailSection.classList.add('hidden');
  document.querySelectorAll('#sites-tbody tr').forEach((r) => r.classList.remove('selected-row'));
  currentSelectedUrl = null;
});

window.addEventListener('DOMContentLoaded', loadSites);
