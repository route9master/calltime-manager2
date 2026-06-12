const router = require('express').Router();
const { pool } = require('../db');
const { authenticate, adminOnly } = require('../middleware/auth');

router.post('/sync', authenticate, async (req, res) => {
  const { calls } = req.body;
  if (!Array.isArray(calls) || calls.length === 0) {
    return res.json({ inserted: 0 });
  }

  let inserted = 0;
  for (const call of calls) {
    const { phone_number, call_date, duration, call_type } = call;
    if (!phone_number || !call_date) continue;
    try {
      const ts = new Date(call_date);
      if (isNaN(ts.getTime())) continue;
      const dateStr = ts.toISOString().split('T')[0];
      const result = await pool.query(
        `INSERT INTO call_logs (user_id, phone_number, call_date, call_timestamp, duration, call_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, phone_number, call_timestamp) DO NOTHING`,
        [req.user.id, phone_number, dateStr, ts.toISOString(), duration || 0, call_type || 'OUTGOING']
      );
      inserted += result.rowCount;
    } catch {}
  }

  res.json({ inserted });
});

router.get('/my', authenticate, async (req, res) => {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const todayStr = now.toISOString().split('T')[0];
  const { start = monthStart, end = todayStr } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM call_logs
       WHERE user_id = $1
         AND call_date >= $2::date
         AND call_date <= $3::date
       ORDER BY call_timestamp DESC`,
      [req.user.id, start, end]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const todayStr = now.toISOString().split('T')[0];
  const { start = monthStart, end = todayStr } = req.query;
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as call_count, COALESCE(SUM(duration), 0) as total_duration
       FROM call_logs
       WHERE user_id = $1
         AND call_date >= $2::date
         AND call_date <= $3::date`,
      [req.user.id, start, end]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

router.get('/ranking', authenticate, async (req, res) => {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const start = `${yearMonth}-01`;
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  try {
    const result = await pool.query(
      `SELECT u.id, u.name,
              COUNT(c.id) as call_count,
              COALESCE(SUM(c.duration), 0) as total_duration
       FROM users u
       LEFT JOIN call_logs c ON u.id = c.user_id
         AND c.call_date >= $1 AND c.call_date <= $2
       WHERE u.role = 'employee'
       GROUP BY u.id, u.name
       ORDER BY total_duration DESC`,
      [start, end]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

router.get('/admin', authenticate, adminOnly, async (req, res) => {
  const { userId, start, end } = req.query;
  try {
    const result = await pool.query(
      `SELECT c.*, u.name as user_name
       FROM call_logs c
       JOIN users u ON c.user_id = u.id
       WHERE ($1::integer IS NULL OR c.user_id = $1::integer)
         AND ($2::date IS NULL OR c.call_date >= $2::date)
         AND ($3::date IS NULL OR c.call_date <= $3::date)
       ORDER BY c.call_date DESC`,
      [userId || null, start || null, end || null]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

router.get('/admin-detail', authenticate, adminOnly, async (req, res) => {
  const { userId, start, end } = req.query;
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE call_type = 'OUTGOING') AS outgoing_count,
         COUNT(*) FILTER (WHERE call_type = 'INCOMING') AS incoming_count,
         COUNT(*) FILTER (WHERE call_type IN ('MISSED','REJECTED')) AS missed_count,
         COALESCE(SUM(duration) FILTER (WHERE call_type = 'OUTGOING'), 0) AS outgoing_duration,
         COALESCE(SUM(duration) FILTER (WHERE call_type = 'INCOMING'), 0) AS incoming_duration
       FROM call_logs
       WHERE ($1::integer IS NULL OR user_id = $1::integer)
         AND ($2::date IS NULL OR call_date >= $2::date)
         AND ($3::date IS NULL OR call_date <= $3::date)`,
      [userId || null, start || null, end || null]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

router.get('/admin-daily', authenticate, adminOnly, async (req, res) => {
  const { userId, date } = req.query;
  const dateStr = date || new Date().toISOString().split('T')[0];
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE call_type = 'OUTGOING') AS outgoing_count,
         COUNT(*) FILTER (WHERE call_type = 'INCOMING') AS incoming_count,
         COUNT(*) FILTER (WHERE call_type IN ('MISSED','REJECTED')) AS missed_count,
         COALESCE(SUM(duration), 0) AS total_duration
       FROM call_logs
       WHERE user_id = $1::integer
         AND call_date = $2::date`,
      [userId, dateStr]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

router.get('/admin-daily-all', authenticate, adminOnly, async (req, res) => {
  const { date } = req.query;
  const dateStr = date || new Date().toISOString().split('T')[0];
  try {
    const result = await pool.query(
      `SELECT u.id, u.name,
              COUNT(c.id) FILTER (WHERE c.call_type = 'OUTGOING') AS outgoing_count,
              COUNT(c.id) FILTER (WHERE c.call_type = 'INCOMING') AS incoming_count,
              COUNT(c.id) FILTER (WHERE c.call_type IN ('MISSED','REJECTED')) AS missed_count,
              COALESCE(SUM(c.duration), 0) AS total_duration
       FROM users u
       LEFT JOIN call_logs c ON u.id = c.user_id AND c.call_date = $1::date
       WHERE u.role = 'employee'
       GROUP BY u.id, u.name
       ORDER BY total_duration DESC`,
      [dateStr]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
