/* ═══════════════════════════════════════════════════════════
   Users Routes
   ═══════════════════════════════════════════════════════════ */

'use strict';

const express           = require('express');
const { getDbInstance } = require('../db/database');
const authenticate      = require('../middleware/auth');

const router = express.Router();
const db = () => getDbInstance();

function formatUser(u, viewerUsername) {
  const followerCount  = (db().prepare('SELECT COUNT(*) AS c FROM follows WHERE following = ?').get(u.username) || {}).c || 0;
  const followingCount = (db().prepare('SELECT COUNT(*) AS c FROM follows WHERE follower  = ?').get(u.username) || {}).c || 0;
  const postCount      = (db().prepare('SELECT COUNT(*) AS c FROM posts   WHERE author    = ?').get(u.username) || {}).c || 0;
  const isFollowing    = viewerUsername && viewerUsername !== u.username
    ? !!db().prepare('SELECT 1 AS x FROM follows WHERE follower = ? AND following = ?').get(viewerUsername, u.username)
    : false;

  return {
    username:     u.username,
    displayName:  u.display_name,
    bio:          u.bio || '',
    joinedAt:     u.joined_at,
    postCount,
    followerCount,
    followingCount,
    isFollowing,
    isMe: viewerUsername === u.username,
  };
}

/* GET /api/users */
router.get('/', authenticate, (req, res) => {
  const { search = '' } = req.query;
  const me = req.user.username;
  let rows;

  if (search.trim()) {
    const q = `%${search.trim().toLowerCase()}%`;
    rows = db().prepare(`
      SELECT * FROM users
      WHERE username != ?
        AND (LOWER(username) LIKE ? OR LOWER(display_name) LIKE ? OR LOWER(bio) LIKE ?)
      ORDER BY display_name ASC
    `).all(me, q, q, q);
  } else {
    rows = db().prepare('SELECT * FROM users WHERE username != ? ORDER BY display_name ASC').all(me);
  }

  res.json(rows.map(u => formatUser(u, me)));
});

/* GET /api/users/me  — MUST be before /:username */
router.get('/me', authenticate, (req, res) => {
  const user = db().prepare('SELECT * FROM users WHERE username = ?').get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json(formatUser(user, req.user.username));
});

/* PUT /api/users/me */
router.put('/me', authenticate, (req, res) => {
  const displayName = (req.body.displayName || '').trim();
  const bio         = (req.body.bio         || '').trim();

  if (!displayName) return res.status(400).json({ error: 'Display name cannot be empty.' });
  if (displayName.length > 40) return res.status(400).json({ error: 'Display name too long (max 40 chars).' });
  if (bio.length > 160) return res.status(400).json({ error: 'Bio too long (max 160 chars).' });

  db().prepare('UPDATE users SET display_name = ?, bio = ? WHERE username = ?')
    .run(displayName, bio, req.user.username);

  const user = db().prepare('SELECT * FROM users WHERE username = ?').get(req.user.username);
  res.json(formatUser(user, req.user.username));
});

/* GET /api/users/:username */
router.get('/:username', authenticate, (req, res) => {
  const user = db().prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json(formatUser(user, req.user.username));
});

/* POST /api/users/:username/follow */
router.post('/:username/follow', authenticate, (req, res) => {
  const { username } = req.params;
  const me           = req.user.username;

  if (username === me) return res.status(400).json({ error: 'You cannot follow yourself.' });

  const target = db().prepare('SELECT username FROM users WHERE username = ?').get(username);
  if (!target) return res.status(404).json({ error: 'User not found.' });

  const existing = db().prepare('SELECT 1 AS x FROM follows WHERE follower = ? AND following = ?').get(me, username);

  if (existing) {
    db().prepare('DELETE FROM follows WHERE follower = ? AND following = ?').run(me, username);
  } else {
    db().prepare('INSERT INTO follows (follower, following) VALUES (?,?)').run(me, username);
  }

  const followerCount = (db().prepare('SELECT COUNT(*) AS c FROM follows WHERE following = ?').get(username) || {}).c || 0;
  res.json({ following: !existing, followerCount });
});

module.exports = router;
