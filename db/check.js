require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkDb() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'site_insights';

  console.log(`Checking MySQL connection to [${dbName}] at ${host}...`);

  try {
    const conn = await mysql.createConnection({ host, user, password, database: dbName });
    console.log(` Connected to MySQL database: "${dbName}"\n`);

    const [sites] = await conn.query('SELECT * FROM sites');
    console.log(`==> Table "sites" has ${sites.length} row(s):`);
    console.table(sites);

    const [scans] = await conn.query('SELECT id, site_id, strategy, score, fcp_ms, lcp_ms, created_at FROM scans ORDER BY id DESC LIMIT 5');
    console.log(`\n==> Table "scans" has records (showing latest ${scans.length}):`);
    console.table(scans);

    await conn.end();
  } catch (err) {
    console.error('Check failed:', err.message);
  }
}

checkDb();
