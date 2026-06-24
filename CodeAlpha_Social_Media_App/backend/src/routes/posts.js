/* ═══════════════════════════════════════════════════════════
   Posts Routes
   ═══════════════════════════════════════════════════════════ */

'use strict';

const express           = require('express');
const { getDbInstance } = require('../db/database');
const authenticate      = require('../middleware/auth');

const router = express.Router();
const db = () => getDbInstance();

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatPost(post, viewerUsername) {
  const author = db().prepare('SELECT username, display_name, bio FROM users WHERE username = ?').get(post.author);
  if (!author) return null;

  const likeCount    = (db().prepare('SELECT COUNT(*) AS c FROM likes    WHERE post_id = ?').get(post.id) || {}).c || 0;
  const commentCount = (db().prepare('SELECT COUNT(*) AS c FROM comments WHERE post_id = ?').get(post.id) || {}).c || 0;
  const isLiked      = viewerUsername
    ? !!db().prepare('SELECT 1 AS x FROM likes WHERE post_id = ? AND username = ?').get(post.id, viewerUsername)
    : false;

  return {
    id:        post.id,
    content:   post.content,
    imageUrl:  post.image_url || '',
    createdAt: post.created_at,
    likeCount,
    commentCount,
    isLiked,
    author: {
      username:    author.username,
      displayName: author.display_name,
      bio:         author.bio || '',
    },
  };
}

/* GET /api/posts */
router.get('/', authenticate, (req, res) => {
  const { tab = 'all', author } = req.query;
  const me = req.user.username;
  let rows;

  if (author) {
    rows = db().prepare('SELECT * FROM posts WHERE author = ? ORDER BY created_at DESC').all(author);
  } else if (tab === 'following') {
    rows = db().prepare(`
      SELECT * FROM posts
      WHERE author = ?
         OR author IN (SELECT following FROM follows WHERE follower = ?)
      ORDER BY created_at DESC
    `).all(me, me);
  } else {
    rows = db().prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
  }

  res.json(rows.map(p => formatPost(p, me)).filter(Boolean));
});

/* GET /api/posts/:id */
router.get('/:id', authenticate, (req, res) => {
  const post = db().prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  const formatted = formatPost(post, req.user.username);
  if (!formatted) return res.status(404).json({ error: 'Post author not found.' });
  res.json(formatted);
});

/* POST /api/posts */
router.post('/', authenticate, (req, res) => {
  const content  = (req.body.content  || '').trim();
  const imageUrl = (req.body.imageUrl || '').trim();

  if (!content) return res.status(400).json({ error: 'Post content cannot be empty.' });
  if (content.length > 500) return res.status(400).json({ error: 'Post is too long (max 500 characters).' });

  const id  = genId();
  const now = new Date().toISOString();
  db().prepare('INSERT INTO posts (id, author, content, image_url, created_at) VALUES (?,?,?,?,?)')
    .run(id, req.user.username, content, imageUrl, now);

  const post = db().prepare('SELECT * FROM posts WHERE id = ?').get(id);
  res.status(201).json(formatPost(post, req.user.username));
});

/* DELETE /api/posts/:id */
router.delete('/:id', authenticate, (req, res) => {
  const post = db().prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (post.author !== req.user.username) return res.status(403).json({ error: 'You can only delete your own posts.' });

  // Delete related likes and comments first (no CASCADE in sql.js)
  db().prepare('DELETE FROM likes    WHERE post_id = ?').run(req.params.id);
  db().prepare('DELETE FROM comments WHERE post_id = ?').run(req.params.id);
  db().prepare('DELETE FROM posts    WHERE id = ?').run(req.params.id);
  res.json({ deleted: true, id: req.params.id });
});

/* POST /api/posts/:id/like */
router.post('/:id/like', authenticate, (req, res) => {
  const { id } = req.params;
  const me     = req.user.username;

  const post = db().prepare('SELECT id FROM posts WHERE id = ?').get(id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const alreadyLiked = db().prepare('SELECT 1 AS x FROM likes WHERE post_id = ? AND username = ?').get(id, me);

  if (alreadyLiked) {
    db().prepare('DELETE FROM likes WHERE post_id = ? AND username = ?').run(id, me);
  } else {
    db().prepare('INSERT INTO likes (post_id, username) VALUES (?,?)').run(id, me);
  }

  const likeCount = (db().prepare('SELECT COUNT(*) AS c FROM likes WHERE post_id = ?').get(id) || {}).c || 0;
  res.json({ liked: !alreadyLiked, likeCount });
});

module.exports = router;
