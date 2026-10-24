# SiteInsight

> A plain-English website performance diagnostic web application that translates technical Lighthouse audits into an actionable optimization report for students, junior developers, and freelancers.

---

## 📋 Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Quick Start & Setup (< 10 Minutes)](#quick-start--setup--10-minutes)
- [Database Schema](#database-schema)
- [REST API Reference](#rest-api-reference)
- [Deployment Guide](#deployment-guide)
- [Examiner Demo Script](#examiner-demo-script)
- [License](#license)

---

## Overview

Lighthouse and PageSpeed reports are often dense, technical, and overwhelming for beginners. **SiteInsight** bridges this gap by analyzing any public URL and translating raw performance data into an intuitive diagnosis:
- **Health Score**: A circular gauge rating performance from $0$ to $100$ across 4 intuitive clinical tiers.
- **Symptoms**: What is slowing the page down in plain English.
- **Prescriptions**: Prioritized, beginner-friendly fixes complete with concrete code and tool examples.

### 🎯 Doctor’s Performance Scoring Criteria

| Score | Label | Color | Doctor’s Verdict |
|---|---|---|---|
| **90 to 100** | **Excellent** | 🟢 Green | Your page loads fast and meets Google’s recommended performance targets. |
| **70 to 89** | **Good** | 🟡 Yellow | Healthy overall. A few fixes would make it noticeably snappier. |
| **50 to 69** | **Needs Work** | 🟠 Orange | Usable, but visitors on slower mobile networks will notice delays. Fix the top issues. |
| **0 to 49** | **Poor** | 🔴 Red | Serious speed problems are likely to frustrate visitors. Fix the top issues first. |

---

## ✨ Key Features

1. **Dual Device Analysis**: Analyze any public URL for both Mobile and Desktop experiences.
2. **Core Web Vitals Diagnosis**: Plain-English evaluation of FCP, LCP, TBT, CLS, and Speed Index against official Google thresholds.
3. **Doctor's Prescriptions**: Prioritized fixes ranked by estimated time savings ($\text{ms}$ saved), explaining the symptom, the fix, and an example.
4. **Before & After Evolution**: Repeat scans display a comparison banner (e.g. *"Score improved from 54 to 78 (+24)"*).
5. **Interactive Charts (Chart.js)**:
   - **Metrics vs. Good Thresholds**: Horizontal bar chart comparing actual timings against Google's "Good" benchmarks.
   - **Historical Score Trend**: Chronological line chart tracking speed performance over time.
6. **Mobile vs. Desktop Comparison**: One-click side-by-side analysis comparing both device scores simultaneously.
7. **One-Click PDF Export**: Clean, print-friendly stylesheet enabling instant PDF generation via `window.print()`.
8. **In-Memory Caching & Rate Limiting**: `node-cache` prevents duplicate PageSpeed API calls within TTL, while `express-rate-limit` protects API quotas.
9. **MySQL Relational History**: Persists every scan linked to site records with zero ORM overhead using `mysql2/promise`.

---

## 🛠️ Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) | Fast, lightweight, zero build-step overhead |
| **Data Visualization** | Chart.js (CDN) | Responsive, accessible interactive charts |
| **Backend** | Node.js 18+ with Express | Asynchronous I/O, RESTful architecture |
| **Database** | MySQL 8 with `mysql2` | Normalized relational schema using parameterized SQL |
| **External API** | Google PageSpeed Insights API v5 | Industry standard Lighthouse performance engine |
| **Caching** | `node-cache` | Fast in-memory key-value caching |
| **Rate Limiting** | `express-rate-limit` | 10 requests / 15 min per IP protection |
| **Configuration** | `dotenv` | Secure environment variable isolation |

---

## 🏗️ System Architecture

```
[ Browser / Frontend ]
   ├── index.html     (Scan form & animated loading state)
   ├── results.html   (Score gauge, Core Web Vitals, Prescriptions, Chart.js)
   ├── history.html   (Sites table & Score trend line chart)
   └── learn.html     (Glossary & Core Web Vitals thresholds)
          │
          ▼ HTTP JSON REST API
[ Express Backend (Node.js) ]
   ├── Middleware     (validateUrl, express-rate-limit, errorHandler)
   ├── Caching        (node-cache: normalizedUrl|strategy)
   ├── Services       (pagespeed.js -> Google API, parser.js, tips.js)
   └── Database       (config/db.js -> MySQL2 Connection Pool)
          │
     ┌────┴────────────────────────┐
     ▼                             ▼
[ Google PageSpeed API ]    [ MySQL 8 Database ]
  Lighthouse Audits Engine     Tables: sites, scans
```

---

## 🚀 Quick Start & Setup (< 10 Minutes)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MySQL Server](https://dev.mysql.com/downloads/mysql/) (v8.0 or higher)
- A Google PageSpeed Insights API Key (optional for basic testing, recommended for production)

### Step 1: Clone and Install Dependencies
```bash
git clone https://github.com/ambavkarsarangi776/speed_doctor.git
cd speed_doctor
npm install
```

### Step 2: Initialize MySQL Database
Open your terminal and load the provided schema:
```bash
mysql -u root -p < db/schema.sql
```
*(This creates the `speed_doctor` database and the `sites` and `scans` tables with relational foreign keys).*

### Step 3: Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env
```
Open `.env` and fill in your database credentials and API key:
```env
PORT=3000
PAGESPEED_API_KEY=your_google_pagespeed_api_key_here
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=speed_doctor
CACHE_TTL_SECONDS=600
```
> **How to get a Google PageSpeed API Key:**
> 1. Visit [Google Cloud Console](https://console.cloud.google.com/).
> 2. Enable the **PageSpeed Insights API**.
> 3. Create Credentials $\rightarrow$ **API Key**, and paste it into `PAGESPEED_API_KEY`.

### Step 4: Run the Application
For production:
```bash
npm start
```
For local development (auto-reloads on file change):
```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🗄️ Database Schema

The database uses a clean, normalized relational design defined in `db/schema.sql`:

```sql
CREATE DATABASE IF NOT EXISTS speed_doctor;
USE speed_doctor;

CREATE TABLE IF NOT EXISTS sites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  url VARCHAR(500) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  strategy ENUM('mobile','desktop') NOT NULL,
  score INT NOT NULL,
  fcp_ms INT,
  lcp_ms INT,
  tbt_ms INT,
  cls DECIMAL(6,3),
  speed_index_ms INT,
  total_bytes INT,
  issues_json JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  INDEX idx_site_created (site_id, created_at)
);
```

---

## 📡 REST API Reference

| Endpoint | Method | Description | Request Body / Query | Success Response |
|---|---|---|---|---|
| `/api/scan` | `POST` | Analyze a website URL | `{"url": "https://example.com", "strategy": "mobile"}` | `200 OK` (Full scan report JSON) |
| `/api/scan/:id` | `GET` | Get saved report by scan ID | Path param `:id` | `200 OK` (Scan report JSON) or `404 NOT_FOUND` |
| `/api/history` | `GET` | Scans for a URL or latest 20 scans | `?url=https://example.com` (optional) | `200 OK` `[{ id, strategy, score, lcp_ms, created_at }]` |
| `/api/sites` | `GET` | Summary of all analyzed sites | None | `200 OK` `[{ id, url, scanCount, lastScore, lastScanAt }]` |
| `/api/health` | `GET` | Server health check | None | `200 OK` `{"status": "ok"}` |

### Error Response Format
All errors follow a unified, predictable structure:
```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "Please enter a valid http or https URL."
  }
}
```
Standard error codes: `INVALID_URL`, `INVALID_STRATEGY`, `SITE_UNREACHABLE`, `QUOTA_EXCEEDED`, `TIMEOUT`, `NOT_FOUND`, `RATE_LIMITED`, `SERVER_ERROR`.

---

## ☁️ Deployment Guide

### Option 1: Deploy on Render
1. Create a free **Web Service** on [Render](https://render.com/).
2. Connect your GitHub repository `speed_doctor`.
3. Set the runtime environment:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Set up a free cloud MySQL database (e.g. [Aiven](https://aiven.io/) or [Railway MySQL](https://railway.app/)).
5. Import `db/schema.sql` into your cloud MySQL database.
6. Under Render **Environment Variables**, add:
   - `PORT=3000`
   - `PAGESPEED_API_KEY=your_key`
   - `DB_HOST=your-cloud-db-host`
   - `DB_USER=your-cloud-db-user`
   - `DB_PASSWORD=your-cloud-db-password`
   - `DB_NAME=speed_doctor`
   - `CACHE_TTL_SECONDS=600`
7. Click **Deploy**. Your app is live!

### Option 2: Deploy on Railway
1. Create a new project on [Railway](https://railway.app/).
2. Add a **MySQL** database service.
3. Use Railway's query editor to execute the contents of `db/schema.sql`.
4. Add a **GitHub Repo** service connected to `speed_doctor`.
5. Under service variables, reference the MySQL variables (`MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, etc.) and add `PAGESPEED_API_KEY`.
6. Railway automatically detects Node.js and starts the server via `npm start`.

---

## 🎓 Examiner Demo Script

Use this 6-step walkthrough during practical examinations or project evaluations:

1. **Scan a Heavy / Slow Website**:
   - Enter a complex URL (e.g. `https://cnn.com`) on Mobile.
   - Show the rotating diagnostic messages and the resulting Red/Orange score gauge.
2. **Explain the Doctor's Prescriptions**:
   - Open an issue card (e.g. *Efficiently encode images* or *Eliminate render-blocking resources*).
   - Point out the plain-English explanation of the **Symptom**, the **Prescription**, and the concrete code **Example**.
3. **Scan a Lightweight Website**:
   - Enter a minimal website (e.g. `https://example.com`).
   - Show the Green high score ($90+$) and the *No Critical Issues Found* celebration.
4. **Demonstrate Comparative Analysis**:
   - Click the **⚡ Compare with Desktop** button.
   - Show the side-by-side Mobile vs. Desktop comparison cards and the score difference pill.
5. **Demonstrate History & Score Trends**:
   - Navigate to the **History** tab.
   - Show the analyzed sites table.
   - Click a site to reveal the interactive **Score Trend Line Chart** and previous reports.
6. **Demonstrate Caching & Code Architecture**:
   - Re-scan the same URL from the home page $\rightarrow$ highlight instant return with the `Cached` badge.
   - Explain the CommonJS modular architecture: separation of concerns between routes, services, middleware, and database pool.

---

## 📄 License
ISC License &bull; Created for Academic and Educational Web Technology Demonstrations.
