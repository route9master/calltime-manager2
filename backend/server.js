require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/prize', require('./routes/prize'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;

initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('DB init failed:', err);
    process.exit(1);
  });
