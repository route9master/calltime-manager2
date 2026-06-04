const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, name, role, created_at FROM users ORDER BY created_at ASC'
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

router.post('/', authenticate, adminOnly, async (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: '모든 필드를 입력하세요.' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, name, role',
      [username, hashed, name, 'employee']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
    res.status(500).json({ error: '서버 오류' });
  }
});

router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: '자신의 계정은 삭제할 수 없습니다.' });
  }
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: '삭제 완료' });
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
