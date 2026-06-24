/* ═══════════════════════════════════════════════════════════
   Auth Routes
   ═══════════════════════════════════════════════════════════ */

'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { getDbInstance } = require('../db/database');
const authenticate      = require('../middleware/auth');

const router = express.Router();

const db = () => getDbInstance();

function makeToken(username) {
  return jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function toPublic(u) {
  return {
    username:    u.username,
    displayName: u.display_name,
    bio:         u.bio || '',
    joinedAt:    u.joined_at,
  };
}

/* POST /api/auth/register */
router.post('/register', (req, res) => {
  let { username = '', displayName = '', bio = '', password = '' } = req.body;

  username    = username.trim().toLowerCase();
  displayName = displayName.trim();
  bio         = bio.trim();

  if (!username || !displayName || !password) {
    return res.status(400).json({ error: 'username, displayName, and password are required.' });
  }
  if (!/^[a-z0-9_]{2,20}$/.test(username)) {
    return res.status(400).json({ error: 'Username: 2–20 chars, lowercase letters / numbers / underscores only.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (displayName.length > 40) {
    return res.status(400).json({ error: 'Display name too long (max 40 chars).' });
  }

  const existing = db().prepare('SELECT username FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'That username is already taken.' });

  const hashed = bcrypt.hashSync(password, 10);
  db().prepare('INSERT INTO users (username, display_name, bio, password, joined_at) VALUES (?,?,?,?,?)')
    .run(username, displayName, bio, hashed, new Date().toISOString());

  const user  = db().prepare('SELECT * FROM users WHERE username = ?').get(username);
  const token = makeToken(username);
  res.status(201).json({ user: toPublic(user), token });
});

/* POST /api/auth/login */
router.post('/login', (req, res) => {
  const { username = '', password = '' } = req.body;
  if (!username.trim() || !password) {
    return res.status(400).json({ error: 'Please fill in all fields.' });
  }

  const user = db().prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  res.json({ user: toPublic(user), token: makeToken(user.username) });
});

/* GET /api/auth/me */
router.get('/me', authenticate, (req, res) => {
  const user = db().prepare('SELECT * FROM users WHERE username = ?').get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: toPublic(user) });
});

module.exports = router;
