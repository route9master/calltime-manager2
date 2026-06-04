const router = require('express').Router();
const { pool } = require('../db');
const { authenticate, adminOnly } = require('../middleware/auth');

const getCurrentYearMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

router.get('/', authenticate, async (req, res) => {
  const ym = getCurrentYearMonth();
  try {
    const result = await pool.query(
      'SELECT * FROM monthly_prizes WHERE year_month = $1',
      [ym]
    );
    res.json(result.rows[0] || null);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

router.put('/', authenticate, adminOnly, async (req, res) => {
  const { title, description, image_url } = req.body;
  const ym = getCurrentYearMonth();
  if (!title) return res.status(400).json({ error: '상품명을 입력하세요.' });

  try {
    const result = await pool.query(
      `INSERT INTO monthly_prizes (year_month, title, description, image_url, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (year_month) DO UPDATE
       SET title = $2, description = $3, image_url = $4, updated_at = NOW()
       RETURNING *`,
      [ym, title, description || null, image_url || null]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
