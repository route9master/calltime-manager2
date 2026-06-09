const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(20) DEFAULT 'employee',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS call_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      phone_number VARCHAR(50) NOT NULL,
      call_date DATE NOT NULL,
      call_timestamp TIMESTAMPTZ NOT NULL,
      duration INTEGER NOT NULL DEFAULT 0,
      call_type VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, phone_number, call_timestamp)
    );

    CREATE TABLE IF NOT EXISTS monthly_prizes (
      id SERIAL PRIMARY KEY,
      year_month VARCHAR(7) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      image_url TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const bcrypt = require('bcryptjs');
  const existing = await pool.query("SELECT id FROM users WHERE username = 'admin'");
  if (existing.rows.length === 0) {
    const hashed = await bcrypt.hash('admin1234', 10);
    await pool.query(
      "INSERT INTO users (username, password, name, role) VALUES ('admin', $1, '관리자', 'admin')",
      [hashed]
    );
    console.log('Admin account created: admin / admin1234');
  }
};

module.exports = { pool, initDB };
