/* ═══════════════════════════════════════════════════════════
   Comments Routes  —  /api/posts/:postId/comments
   ═══════════════════════════════════════════════════════════ */

'use strict';

const express           = require('express');
const { getDbInstance } = require('../db/database');
const authenticate      = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
const db = () => getDbInstance();

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatComment(c) {
  const author = db().prepare('SELECT username, display_name FROM users WHERE username = ?').get(c.author);
  return {
    id:        c.id,
    text:      c.text,
    createdAt: c.created_at,
    author: {
      username:    author ? author.username     : c.author,
      displayName: author ? author.display_name : c.author,
    },
  };
}

/* GET /api/posts/:postId/comments */
router.get('/', authenticate, (req, res) => {
  const { postId } = req.params;
  const post = db().prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const comments = db().prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC').all(postId);
  res.json(comments.map(formatComment));
});

/* POST /api/posts/:postId/comments */
router.post('/', authenticate, (req, res) => {
  const { postId } = req.params;
  const text = (req.body.text || '').trim();

  if (!text) return res.status(400).json({ error: 'Comment cannot be empty.' });
  if (text.length > 280) return res.status(400).json({ error: 'Comment too long (max 280 characters).' });

  const post = db().prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const id  = genId();
  db().prepare('INSERT INTO comments (id, post_id, author, text, created_at) VALUES (?,?,?,?,?)')
    .run(id, postId, req.user.username, text, new Date().toISOString());

  const comment      = db().prepare('SELECT * FROM comments WHERE id = ?').get(id);
  const commentCount = (db().prepare('SELECT COUNT(*) AS c FROM comments WHERE post_id = ?').get(postId) || {}).c || 0;

  res.status(201).json({ comment: formatComment(comment), commentCount });
});

/* DELETE /api/posts/:postId/comments/:commentId */
router.delete('/:commentId', authenticate, (req, res) => {
  const { postId, commentId } = req.params;
  const comment = db().prepare('SELECT * FROM comments WHERE id = ?').get(commentId);

  if (!comment) return res.status(404).json({ error: 'Comment not found.' });
  if (comment.author !== req.user.username) return res.status(403).json({ error: 'You can only delete your own comments.' });

  db().prepare('DELETE FROM comments WHERE id = ?').run(commentId);

  const commentCount = (db().prepare('SELECT COUNT(*) AS c FROM comments WHERE post_id = ?').get(postId) || {}).c || 0;
  res.json({ deleted: true, commentCount });
});

module.exports = router;
