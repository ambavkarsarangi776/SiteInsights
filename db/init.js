require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'site_insights';

  console.log(`Connecting to MySQL on ${host} as user '${user}'...`);

  let connection;
  try {
    // 1. Connect without selecting database
    connection = await mysql.createConnection({
      host,
      user,
      password
    });
    console.log('Connected to MySQL server.');

    // 2. Create database if it does not exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    console.log(`Database '${dbName}' verified/created.`);

    // 3. Switch to the database
    await connection.query(`USE \`${dbName}\`;`);

    // 4. Create sites table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        url VARCHAR(500) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table "sites" verified/created.');

    // 5. Create scans table
    await connection.query(`
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
    `);
    console.log('Table "scans" verified/created.');

    // 6. Sync any scans from local_history.json that aren't in MySQL yet
    const localHistoryPath = path.join(__dirname, '../data/local_history.json');
    if (fs.existsSync(localHistoryPath)) {
      try {
        const raw = fs.readFileSync(localHistoryPath, 'utf8');
        const localStore = JSON.parse(raw);
        if (localStore.scans && localStore.scans.length > 0) {
          console.log(`Syncing historical scans from local JSON store into MySQL...`);
          
          const siteMap = {};
          let importedCount = 0;

          // Fetch existing sites
          const [existingSites] = await connection.query('SELECT id, url FROM sites');
          for (const s of existingSites) {
            siteMap[s.url] = s.id;
          }

          // Sort scans chronologically (oldest to newest)
          const sortedScans = [...localStore.scans].sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );

          for (const s of sortedScans) {
            if (!siteMap[s.url]) {
              const [siteRes] = await connection.query(
                'INSERT INTO sites (url) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
                [s.url]
              );
              siteMap[s.url] = siteRes.insertId;
            }

            const siteId = siteMap[s.url];
            const scanDate = s.created_at ? new Date(s.created_at) : new Date();

            // Check if scan already exists by site and approximate time (within 2 seconds)
            const [exists] = await connection.query(
              `SELECT id FROM scans 
               WHERE site_id = ? AND strategy = ? AND score = ? 
               AND ABS(TIMESTAMPDIFF(SECOND, created_at, ?)) <= 2`,
              [siteId, s.strategy || 'mobile', s.score || 0, scanDate]
            );

            if (!exists || exists.length === 0) {
              await connection.query(
                `INSERT INTO scans (
                  site_id, strategy, score, fcp_ms, lcp_ms, tbt_ms, cls, speed_index_ms, total_bytes, issues_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  siteId,
                  s.strategy || 'mobile',
                  s.score || 0,
                  s.fcp_ms || 0,
                  s.lcp_ms || 0,
                  s.tbt_ms || 0,
                  s.cls || 0,
                  s.speed_index_ms || 0,
                  s.total_bytes || 0,
                  JSON.stringify(s.issues || []),
                  scanDate
                ]
              );
              importedCount++;
            }
          }
          console.log(`Synced ${importedCount} scans into MySQL tables!`);
        }
      } catch (migErr) {
        console.warn('Scan sync notice:', migErr.message);
      }
    }

    console.log('\nSUCCESS! Database setup and synchronization completed successfully.');
  } catch (err) {
    console.error('\nDatabase initialization failed:');
    console.error(err.message);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nHint: Please verify DB_PASSWORD and DB_USER in your .env file.');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
