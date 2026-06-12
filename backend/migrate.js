require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('ERROR: DATABASE_URL is not set.');
  console.error('Usage: DATABASE_URL="postgresql://..." node migrate.js');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', '001_add_call_timestamp.sql'),
    'utf8'
  );

  const client = await pool.connect();
  try {
    console.log('Connected to database.');
    console.log('Running migration 001_add_call_timestamp.sql ...\n');

    await client.query('BEGIN');

    // Execute each statement split by semicolon+newline, preserving DO $$ blocks
    await client.query(sql);

    await client.query('COMMIT');

    // Verify result
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'call_logs'
      ORDER BY ordinal_position
    `);
    console.log('\ncall_logs columns after migration:');
    res.rows.forEach((r) =>
      console.log(`  ${r.column_name.padEnd(20)} ${r.data_type.padEnd(20)} nullable=${r.is_nullable}`)
    );

    const constraints = await client.query(`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'call_logs'::regclass
      ORDER BY conname
    `);
    console.log('\ncall_logs constraints:');
    constraints.rows.forEach((r) =>
      console.log(`  ${r.conname.padEnd(50)} type=${r.contype}`)
    );

    console.log('\nMigration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nMigration FAILED, rolled back.');
    console.error(err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
