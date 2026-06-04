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
      await pool.query(
        `INSERT INTO call_logs (user_id, phone_number, call_date, duration, call_type)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, phone_number, call_date) DO NOTHING`,
        [req.user.id, phone_number, call_date, duration || 0, call_type || 'OUTGOING']
      );
      inserted++;
    } catch {}
  }

  res.json({ inserted });
});

router.get('/my', authenticate, async (req, res) => {
  const { start, end } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM call_logs
       WHERE user_id = $1
         AND ($2::date IS NULL OR call_date >= $2::date)
         AND ($3::date IS NULL OR call_date <= $3::date)
       ORDER BY call_date DESC`,
      [req.user.id, start || null, end || null]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  const { start, end } = req.query;
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as call_count, COALESCE(SUM(duration), 0) as total_duration
       FROM call_logs
       WHERE user_id = $1
         AND ($2::date IS NULL OR call_date >= $2::date)
         AND ($3::date IS NULL OR call_date <= $3::date)`,
      [req.user.id, start || null, end || null]
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

module.exports = router;
