/* ═══════════════════════════════════════════════════════════
   NEXUS — Express Server Entry Point
   ═══════════════════════════════════════════════════════════ */

'use strict';

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const { initDb } = require('./src/db/database');

async function startServer() {
  /* ── Initialize SQLite database first ── */
  await initDb();
  console.log('✅  Database ready');

  const app = express();

  /* ── Middleware ── */
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  /* ── Serve frontend static files ── */
  const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
  app.use(express.static(FRONTEND_DIR));

  /* ── API Routes ── */
  app.use('/api/auth',  require('./src/routes/auth'));
  app.use('/api/posts', require('./src/routes/posts'));
  app.use('/api/posts/:postId/comments', require('./src/routes/comments'));
  app.use('/api/users', require('./src/routes/users'));

  /* ── Catch-all: serve index.html for non-API routes ── */
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found.' });
    }
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });

  /* ── Start listening ── */
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log(`║  🚀  Nexus running → http://localhost:${PORT}  ║`);
    console.log('╠══════════════════════════════════════════╣');
    console.log('║  Demo: alice / bob  (password: pass123)  ║');
    console.log('╚══════════════════════════════════════════╝\n');
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
