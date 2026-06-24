/* ═══════════════════════════════════════════════════════════════════════
   NEXUS — SOCIAL MEDIA APP · app.js
   GitHub Pages compatible — all data stored in localStorage
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════
   STORAGE — thin wrapper around localStorage
══════════════════════════════════════════════════════ */
const DB = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem('nexus_' + key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('nexus_' + key, JSON.stringify(value)); } catch {}
  },

  /* ── Users ── */
  getUsers()          { return DB.get('users', {}); },
  getUser(username)   { return DB.getUsers()[username] || null; },
  saveUser(user) {
    const users = DB.getUsers();
    users[user.username] = user;
    DB.set('users', users);
  },

  /* ── Session ── */
  getSession()        { return DB.get('session', null); },
  setSession(username){ DB.set('session', username); },
  clearSession()      { localStorage.removeItem('nexus_session'); },

  /* ── Posts ── */
  getPosts()          { return DB.get('posts', []); },
  savePosts(posts)    { DB.set('posts', posts); },
  getPost(id)         { return DB.getPosts().find(p => p.id === id) || null; },

  /* ── Comments ── */
  getComments()       { return DB.get('comments', {}); },
  getPostComments(postId) {
    return (DB.getComments()[postId] || []).slice().reverse();
  },
  addComment(postId, comment) {
    const all = DB.getComments();
    if (!all[postId]) all[postId] = [];
    all[postId].push(comment);
    DB.set('comments', all);
  },
  deleteComment(postId, commentId) {
    const all = DB.getComments();
    if (all[postId]) {
      all[postId] = all[postId].filter(c => c.id !== commentId);
      DB.set('comments', all);
    }
  },
  getCommentCount(postId) {
    return (DB.getComments()[postId] || []).length;
  },
};

/* ══════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════ */
const Utils = {
  id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  hash(str) {
    // Simple deterministic hash for demo — NOT for production
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h.toString(16);
  },

  timeAgo(isoString) {
    const diff = (Date.now() - new Date(isoString)) / 1000;
    if (diff < 60)   return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  initials(displayName) {
    if (!displayName) return '?';
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  avatarColor(username) {
    // Muted, professional colors — no bright hues
    const palette = [
      '#3a3a3a','#2d3748','#374151','#3d4a2e','#3b3042',
      '#2e3b4e','#443322','#2a3d3d','#3e2e3e','#2e3e2e',
    ];
    let h = 0;
    for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) | 0;
    return palette[Math.abs(h) % palette.length];
  },

  setAvatar(el, displayName, username) {
    if (!el) return;
    el.textContent = Utils.initials(displayName);
    el.style.background = Utils.avatarColor(username || displayName);
    el.style.borderColor = 'transparent';
  },

  sanitize(str) {
    return String(str || '').trim();
  },
};

/* ══════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════════════════════ */
const Toast = {
  show(msg, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.25s ease forwards';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },
  success(msg) { Toast.show(msg, 'success'); },
  error(msg)   { Toast.show(msg, 'error'); },
};

/* ══════════════════════════════════════════════════════
   MODAL
══════════════════════════════════════════════════════ */
const Modal = {
  open(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.addEventListener('keydown', Modal._escHandler);
  },
  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
    document.removeEventListener('keydown', Modal._escHandler);
  },
  _escHandler(e) {
    if (e.key === 'Escape') Modal.close();
  },
};

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) Modal.close();
});

/* ══════════════════════════════════════════════════════
   ROUTER
══════════════════════════════════════════════════════ */
const Router = {
  current: 'feed',
  _history: [],

  go(page, data = {}) {
    // All pages inside view-app
    const pages = ['feed', 'discover', 'create', 'profile', 'post-detail'];
    pages.forEach(p => {
      const el = document.getElementById(`page-${p}`);
      if (el) el.classList.toggle('hidden', p !== page);
    });

    // Sidebar nav highlight
    const navMap = { feed: 'feed', discover: 'discover', create: 'create', profile: 'profile' };
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-item').forEach(btn => btn.classList.remove('active'));

    const navKey = Object.keys(navMap).find(k => page.startsWith(k)) || null;
    if (navKey) {
      document.getElementById(`nav-${navKey}`)?.classList.add('active');
      document.getElementById(`mnav-${navKey}`)?.classList.add('active');
    }

    Router._history.push({ page: Router.current, data: {} });
    Router.current = page;

    // Render page content
    switch (page) {
      case 'feed':     Feed.render(data); break;
      case 'discover': Discover.render(); break;
      case 'create':   CreatePost.render(); break;
      case 'profile':  Profile.render(data.username || null); break;
      case 'post-detail': PostDetail.render(data.postId); break;
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  back() {
    const prev = Router._history.pop();
    if (prev) Router.go(prev.page, prev.data);
    else Router.go('feed');
  },
};

/* ══════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════ */
const Auth = {
  currentUser: null,

  init() {
    Auth._seedDemoAccounts();
    const session = DB.getSession();
    if (session) {
      const user = DB.getUser(session);
      if (user) {
        Auth.currentUser = user;
        Auth._showApp();
        return;
      }
    }
    Auth._showAuth();
  },

  _seedDemoAccounts() {
    const existing = DB.getUsers();
    const demoUsers = [
      {
        username: 'alice',
        password: Utils.hash('pass123'),
        displayName: 'Alice Chen',
        bio: 'Designer & creative thinker. Coffee enthusiast ☕',
        following: ['bob'],
        followers: ['bob'],
        joinedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      {
        username: 'bob',
        password: Utils.hash('pass123'),
        displayName: 'Bob Martinez',
        bio: 'Full-stack developer. Open source contributor.',
        following: ['alice'],
        followers: ['alice'],
        joinedAt: new Date(Date.now() - 28 * 86400000).toISOString(),
      },
    ];

    demoUsers.forEach(u => {
      if (!existing[u.username]) DB.saveUser(u);
    });

    // Seed demo posts if none exist
    const posts = DB.getPosts();
    if (posts.length === 0) {
      const demoPosts = [
        {
          id: Utils.id(),
          authorUsername: 'alice',
          content: 'Just finished redesigning our dashboard — focusing on reducing cognitive load. Less is more. 🎨',
          imageUrl: '',
          likes: ['bob'],
          createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        },
        {
          id: Utils.id(),
          authorUsername: 'bob',
          content: 'Shipped a new open-source CLI tool today. It handles file watching with zero config. Check it out!',
          imageUrl: '',
          likes: ['alice'],
          createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
        },
        {
          id: Utils.id(),
          authorUsername: 'alice',
          content: 'Typography tip: Use a type scale based on a ratio (like 1.25 or 1.333) for visual harmony. Your designs will look instantly more polished.',
          imageUrl: '',
          likes: [],
          createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
        },
      ];
      DB.savePosts(demoPosts);

      // Seed a comment
      DB.addComment(demoPosts[0].id, {
        id: Utils.id(),
        authorUsername: 'bob',
        text: 'Looks incredible! Would love to see a walkthrough.',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      });
    }
  },

  switchTab(tab) {
    document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
    document.getElementById('form-register').classList.toggle('hidden', tab !== 'register');
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('tab-login').setAttribute('aria-selected', tab === 'login');
    document.getElementById('tab-register').setAttribute('aria-selected', tab === 'register');
  },

  login(e) {
    e.preventDefault();
    const username = Utils.sanitize(document.getElementById('login-username').value);
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    errEl.textContent = '';

    if (!username || !password) {
      errEl.textContent = 'Please fill in all fields.';
      return;
    }

    const user = DB.getUser(username);
    if (!user || user.password !== Utils.hash(password)) {
      errEl.textContent = 'Invalid username or password.';
      return;
    }

    Auth.currentUser = user;
    DB.setSession(username);
    Auth._showApp();
    Toast.success(`Welcome back, ${user.displayName}!`);
  },

  register(e) {
    e.preventDefault();
    const displayName = Utils.sanitize(document.getElementById('reg-displayname').value);
    const username    = Utils.sanitize(document.getElementById('reg-username').value).toLowerCase();
    const bio         = Utils.sanitize(document.getElementById('reg-bio').value);
    const password    = document.getElementById('reg-password').value;
    const errEl       = document.getElementById('register-error');
    errEl.textContent = '';

    if (!displayName || !username || !password) {
      errEl.textContent = 'Please fill in all required fields.';
      return;
    }

    if (!/^[a-z0-9_]{2,20}$/.test(username)) {
      errEl.textContent = 'Username: 2–20 chars, letters/numbers/underscores only.';
      return;
    }

    if (password.length < 6) {
      errEl.textContent = 'Password must be at least 6 characters.';
      return;
    }

    if (DB.getUser(username)) {
      errEl.textContent = 'That username is already taken.';
      return;
    }

    const user = {
      username,
      password: Utils.hash(password),
      displayName,
      bio,
      following: [],
      followers: [],
      joinedAt: new Date().toISOString(),
    };

    DB.saveUser(user);
    Auth.currentUser = user;
    DB.setSession(username);
    Auth._showApp();
    Toast.success(`Account created! Welcome, ${displayName}!`);
  },

  logout() {
    Auth.currentUser = null;
    DB.clearSession();
    document.getElementById('view-app').classList.add('hidden');
    document.getElementById('view-auth').classList.remove('hidden');
    Auth.switchTab('login');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').textContent = '';
  },

  _showAuth() {
    document.getElementById('view-auth').classList.remove('hidden');
    document.getElementById('view-auth').classList.add('active');
    document.getElementById('view-app').classList.add('hidden');
  },

  _showApp() {
    document.getElementById('view-auth').classList.add('hidden');
    document.getElementById('view-auth').classList.remove('active');
    document.getElementById('view-app').classList.remove('hidden');
    Sidebar.update();
    Router.go('feed');
  },
};

/* ══════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════ */
const Sidebar = {
  update() {
    const user = Auth.currentUser;
    if (!user) return;
    Utils.setAvatar(document.getElementById('sidebar-avatar'), user.displayName, user.username);
    document.getElementById('sidebar-displayname').textContent = user.displayName;
    document.getElementById('sidebar-handle').textContent = '@' + user.username;
  },
};

/* ══════════════════════════════════════════════════════
   POSTS — shared rendering helpers
══════════════════════════════════════════════════════ */
const PostRenderer = {
  buildCard(post, opts = {}) {
    const { showComments = false } = opts;
    const me = Auth.currentUser;
    const author = DB.getUser(post.authorUsername);
    if (!author) return '';

    const liked = post.likes.includes(me.username);
    const likeCount = post.likes.length;
    const commentCount = DB.getCommentCount(post.id);
    const isOwn = post.authorUsername === me.username;

    const imageHtml = post.imageUrl
      ? `<img src="${Utils.escapeHtml(post.imageUrl)}" alt="Post image" class="post-image" onerror="this.style.display='none'" />`
      : '';

    const deleteBtn = isOwn
      ? `<button class="btn-danger" onclick="Posts.delete('${post.id}')" aria-label="Delete post">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
         </button>`
      : '';

    const commentsSection = showComments
      ? PostRenderer.buildCommentsSection(post.id)
      : `<button class="post-action-btn" onclick="Router.go('post-detail', {postId:'${post.id}'})" aria-label="View ${commentCount} comments">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
           <span class="action-count">${commentCount}</span>
         </button>`;

    return `
      <article class="post-card" id="post-${post.id}" role="listitem">
        <div class="post-header">
          <div class="post-author-info">
            <div class="avatar sm post-avatar" data-username="${post.authorUsername}" style="cursor:pointer" onclick="Router.go('profile',{username:'${post.authorUsername}'})" title="View profile"></div>
            <div class="post-author-text">
              <span class="post-author-name" onclick="Router.go('profile',{username:'${post.authorUsername}'})">${Utils.escapeHtml(author.displayName)}</span>
              <span class="post-author-handle">@${Utils.escapeHtml(post.authorUsername)}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="post-time">${Utils.timeAgo(post.createdAt)}</span>
            ${deleteBtn}
          </div>
        </div>

        <p class="post-content">${Utils.escapeHtml(post.content)}</p>
        ${imageHtml}

        <div class="post-actions">
          <button
            class="post-action-btn ${liked ? 'liked' : ''}"
            onclick="Posts.toggleLike('${post.id}', this)"
            aria-label="${liked ? 'Unlike' : 'Like'} this post"
            aria-pressed="${liked}"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span class="action-count like-count-${post.id}">${likeCount}</span>
          </button>

          ${commentsSection}

          <div class="post-actions-right">
            <button class="post-action-btn" onclick="Posts.share('${post.id}')" aria-label="Share post">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
          </div>
        </div>

        ${showComments ? `
        <div class="comments-section" id="comments-${post.id}">
          ${PostRenderer.buildCommentsSection(post.id, true)}
        </div>` : ''}
      </article>
    `;
  },

  buildCommentsSection(postId, inline = false) {
    const me = Auth.currentUser;
    const comments = DB.getPostComments(postId);

    const commentItems = comments.map(c => {
      const author = DB.getUser(c.authorUsername);
      if (!author) return '';
      const isOwn = c.authorUsername === me.username;
      return `
        <div class="comment-item">
          <div class="avatar sm comment-avatar" data-username="${c.authorUsername}" style="cursor:pointer;flex-shrink:0" onclick="Router.go('profile',{username:'${c.authorUsername}'})" title="View profile"></div>
          <div class="comment-body">
            <div class="comment-author">${Utils.escapeHtml(author.displayName)}</div>
            <div class="comment-text">${Utils.escapeHtml(c.text)}</div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="comment-time">${Utils.timeAgo(c.createdAt)}</span>
              ${isOwn ? `<button class="btn-danger" style="padding:0 4px;font-size:0.7rem" onclick="Posts.deleteComment('${postId}','${c.id}')" aria-label="Delete comment">Delete</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (!inline) {
      return `<button class="post-action-btn" onclick="Router.go('post-detail',{postId:'${postId}'})" aria-label="View comments">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span class="action-count">${comments.length}</span>
      </button>`;
    }

    return `
      <h3 class="comments-title">Comments (${comments.length})</h3>
      <div id="comment-list-${postId}">
        ${commentItems || '<p style="font-size:0.85rem;color:var(--text-muted)">No comments yet.</p>'}
      </div>
      <div class="comment-form">
        <div class="avatar sm" id="comment-form-avatar-${postId}"></div>
        <div class="comment-input-wrap">
          <input
            class="comment-input"
            id="comment-input-${postId}"
            type="text"
            placeholder="Add a comment…"
            maxlength="280"
            onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();Posts.submitComment('${postId}')}"
            aria-label="Write a comment"
          />
          <button class="comment-submit-btn" onclick="Posts.submitComment('${postId}')" aria-label="Submit comment">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    `;
  },

  /* Call after injecting HTML to paint all avatars */
  paintAvatars(container) {
    container.querySelectorAll('[data-username]').forEach(el => {
      const username = el.dataset.username;
      const user = DB.getUser(username);
      if (user) Utils.setAvatar(el, user.displayName, username);
    });
    // Paint comment form avatars
    const me = Auth.currentUser;
    if (me) {
      container.querySelectorAll('[id^="comment-form-avatar-"]').forEach(el => {
        Utils.setAvatar(el, me.displayName, me.username);
      });
      // Paint create-post avatar
      const createAvatar = document.getElementById('create-avatar');
      if (createAvatar) Utils.setAvatar(createAvatar, me.displayName, me.username);
    }
  },
};

/* ══════════════════════════════════════════════════════
   POSTS — actions
══════════════════════════════════════════════════════ */
const Posts = {
  toggleLike(postId, btn) {
    const me = Auth.currentUser;
    const posts = DB.getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const idx = post.likes.indexOf(me.username);
    if (idx === -1) {
      post.likes.push(me.username);
      btn.classList.add('liked');
      btn.setAttribute('aria-pressed', 'true');
      btn.querySelector('svg').setAttribute('fill', 'currentColor');
    } else {
      post.likes.splice(idx, 1);
      btn.classList.remove('liked');
      btn.setAttribute('aria-pressed', 'false');
      btn.querySelector('svg').setAttribute('fill', 'none');
    }

    DB.savePosts(posts);

    // Update count in DOM
    const countEl = document.querySelector(`.like-count-${postId}`);
    if (countEl) countEl.textContent = post.likes.length;
  },

  delete(postId) {
    if (!confirm('Delete this post?')) return;
    const posts = DB.getPosts().filter(p => p.id !== postId);
    DB.savePosts(posts);

    // Remove from DOM if present
    const el = document.getElementById(`post-${postId}`);
    if (el) {
      el.style.animation = 'fadeOut 0.2s ease forwards';
      setTimeout(() => el.remove(), 200);
    }

    Toast.success('Post deleted.');

    // If on post detail, go back
    if (Router.current === 'post-detail') Router.go('feed');
  },

  create(e) {
    e.preventDefault();
    const content  = Utils.sanitize(document.getElementById('post-content').value);
    const imageUrl = Utils.sanitize(document.getElementById('post-image-url').value);
    const errEl    = document.getElementById('create-error');
    errEl.textContent = '';

    if (!content) { errEl.textContent = 'Post content cannot be empty.'; return; }
    if (content.length > 500) { errEl.textContent = 'Post is too long (max 500 chars).'; return; }

    const me = Auth.currentUser;
    const post = {
      id: Utils.id(),
      authorUsername: me.username,
      content,
      imageUrl,
      likes: [],
      createdAt: new Date().toISOString(),
    };

    const posts = DB.getPosts();
    posts.unshift(post);
    DB.savePosts(posts);

    document.getElementById('post-content').value = '';
    document.getElementById('post-image-url').value = '';
    document.getElementById('char-count').textContent = '0';
    document.getElementById('image-preview-wrap').classList.add('hidden');

    Toast.success('Post published!');
    Router.go('feed');
  },

  removeImagePreview() {
    document.getElementById('post-image-url').value = '';
    document.getElementById('image-preview-wrap').classList.add('hidden');
  },

  submitComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const text = Utils.sanitize(input.value);
    if (!text) return;

    const me = Auth.currentUser;
    const comment = {
      id: Utils.id(),
      authorUsername: me.username,
      text,
      createdAt: new Date().toISOString(),
    };

    DB.addComment(postId, comment);
    input.value = '';

    // Re-render comment list inline
    const listEl = document.getElementById(`comment-list-${postId}`);
    if (listEl) {
      const container = listEl.closest('.comments-section') || listEl.parentElement;
      // Find the h3 and replace list
      const newComments = DB.getPostComments(postId);
      const commentItems = newComments.map(c => {
        const author = DB.getUser(c.authorUsername);
        if (!author) return '';
        const isOwn = c.authorUsername === me.username;
        return `
          <div class="comment-item">
            <div class="avatar sm" data-username="${c.authorUsername}" style="cursor:pointer;flex-shrink:0" onclick="Router.go('profile',{username:'${c.authorUsername}'})" title="View profile"></div>
            <div class="comment-body">
              <div class="comment-author">${Utils.escapeHtml(author.displayName)}</div>
              <div class="comment-text">${Utils.escapeHtml(c.text)}</div>
              <div style="display:flex;align-items:center;gap:8px">
                <span class="comment-time">${Utils.timeAgo(c.createdAt)}</span>
                ${isOwn ? `<button class="btn-danger" style="padding:0 4px;font-size:0.7rem" onclick="Posts.deleteComment('${postId}','${c.id}')" aria-label="Delete comment">Delete</button>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
      listEl.innerHTML = commentItems;

      // Update title
      const titleEl = container.querySelector('.comments-title');
      if (titleEl) titleEl.textContent = `Comments (${newComments.length})`;

      // Paint avatars
      PostRenderer.paintAvatars(listEl);

      // Update comment count in post actions area
      const postCard = document.getElementById(`post-${postId}`);
      if (postCard) {
        const commentBtn = postCard.querySelector('.post-actions .post-action-btn:nth-child(2) .action-count');
        if (commentBtn) commentBtn.textContent = newComments.length;
      }
    }
  },

  deleteComment(postId, commentId) {
    DB.deleteComment(postId, commentId);
    // Re-render inline
    Posts.submitComment.__lastPostId = postId;
    const listEl = document.getElementById(`comment-list-${postId}`);
    if (listEl) {
      const me = Auth.currentUser;
      const newComments = DB.getPostComments(postId);
      const commentItems = newComments.map(c => {
        const author = DB.getUser(c.authorUsername);
        if (!author) return '';
        const isOwn = c.authorUsername === me.username;
        return `
          <div class="comment-item">
            <div class="avatar sm" data-username="${c.authorUsername}" style="cursor:pointer;flex-shrink:0" onclick="Router.go('profile',{username:'${c.authorUsername}'})" title="View profile"></div>
            <div class="comment-body">
              <div class="comment-author">${Utils.escapeHtml(author.displayName)}</div>
              <div class="comment-text">${Utils.escapeHtml(c.text)}</div>
              <div style="display:flex;align-items:center;gap:8px">
                <span class="comment-time">${Utils.timeAgo(c.createdAt)}</span>
                ${isOwn ? `<button class="btn-danger" style="padding:0 4px;font-size:0.7rem" onclick="Posts.deleteComment('${postId}','${c.id}')" aria-label="Delete comment">Delete</button>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
      listEl.innerHTML = commentItems || '<p style="font-size:0.85rem;color:var(--text-muted)">No comments yet.</p>';
      PostRenderer.paintAvatars(listEl);

      const titleEl = listEl.closest('.comments-section')?.querySelector('.comments-title');
      if (titleEl) titleEl.textContent = `Comments (${newComments.length})`;
    }
    Toast.success('Comment deleted.');
  },

  share(postId) {
    const url = window.location.href.split('?')[0] + '?post=' + postId;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => Toast.success('Link copied to clipboard!'));
    } else {
      Toast.show('Share: ' + url);
    }
  },
};

/* ══════════════════════════════════════════════════════
   FEED
══════════════════════════════════════════════════════ */
const Feed = {
  _tab: 'following',

  render() {
    Feed._renderList();
  },

  switchTab(tab) {
    Feed._tab = tab;
    document.getElementById('ftab-following').classList.toggle('active', tab === 'following');
    document.getElementById('ftab-all').classList.toggle('active', tab === 'all');
    Feed._renderList();
  },

  _renderList() {
    const me = Auth.currentUser;
    let posts = DB.getPosts();

    // Sort newest first
    posts = posts.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (Feed._tab === 'following') {
      const followed = [...(me.following || []), me.username];
      posts = posts.filter(p => followed.includes(p.authorUsername));
    }

    const container = document.getElementById('feed-list');

    if (posts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">◈</div>
          <p>${Feed._tab === 'following'
            ? 'Nothing from people you follow yet. Try the <strong>All Posts</strong> tab or discover new users!'
            : 'No posts yet. Be the first to post!'
          }</p>
        </div>`;
      return;
    }

    container.innerHTML = posts.map(p => PostRenderer.buildCard(p)).join('');
    PostRenderer.paintAvatars(container);
  },
};

/* ══════════════════════════════════════════════════════
   DISCOVER
══════════════════════════════════════════════════════ */
const Discover = {
  render() {
    document.getElementById('discover-search').value = '';
    Discover._renderUsers('');
  },

  search(query) {
    Discover._renderUsers(query.toLowerCase().trim());
  },

  _renderUsers(query) {
    const me = Auth.currentUser;
    const users = DB.getUsers();
    const container = document.getElementById('discover-list');

    let list = Object.values(users).filter(u => u.username !== me.username);

    if (query) {
      list = list.filter(u =>
        u.username.includes(query) ||
        u.displayName.toLowerCase().includes(query) ||
        (u.bio || '').toLowerCase().includes(query)
      );
    }

    if (list.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><p>No users found.</p></div>`;
      return;
    }

    const isFollowing = u => (me.following || []).includes(u.username);

    container.innerHTML = list.map(u => `
      <div class="user-card" id="ucard-${u.username}">
        <div class="avatar md" data-username="${u.username}" onclick="Router.go('profile',{username:'${u.username}'})" style="cursor:pointer" title="View profile"></div>
        <div class="user-card-info">
          <div class="user-card-name" onclick="Router.go('profile',{username:'${u.username}'})">${Utils.escapeHtml(u.displayName)}</div>
          <div class="user-card-handle">@${Utils.escapeHtml(u.username)}</div>
          ${u.bio ? `<div class="user-card-bio">${Utils.escapeHtml(u.bio)}</div>` : ''}
        </div>
        <button
          class="btn-outline ${isFollowing(u) ? 'following' : ''}"
          id="follow-btn-${u.username}"
          onclick="Discover.toggleFollow('${u.username}')"
          aria-label="${isFollowing(u) ? 'Unfollow' : 'Follow'} ${u.displayName}"
        >${isFollowing(u) ? 'Following' : 'Follow'}</button>
      </div>
    `).join('');

    PostRenderer.paintAvatars(container);
  },

  toggleFollow(targetUsername) {
    Follow.toggle(targetUsername);
    // Update the button in discover list
    const me = Auth.currentUser;
    const isNowFollowing = (me.following || []).includes(targetUsername);
    const btn = document.getElementById(`follow-btn-${targetUsername}`);
    if (btn) {
      btn.textContent = isNowFollowing ? 'Following' : 'Follow';
      btn.classList.toggle('following', isNowFollowing);
    }
  },
};

/* ══════════════════════════════════════════════════════
   FOLLOW SYSTEM
══════════════════════════════════════════════════════ */
const Follow = {
  toggle(targetUsername) {
    const me = Auth.currentUser;
    const meData = DB.getUser(me.username);
    const target = DB.getUser(targetUsername);
    if (!target || !meData) return;

    meData.following = meData.following || [];
    target.followers = target.followers || [];

    const idx = meData.following.indexOf(targetUsername);
    if (idx === -1) {
      meData.following.push(targetUsername);
      target.followers.push(me.username);
      Toast.success(`You're now following ${target.displayName}.`);
    } else {
      meData.following.splice(idx, 1);
      const ti = target.followers.indexOf(me.username);
      if (ti !== -1) target.followers.splice(ti, 1);
      Toast.show(`Unfollowed ${target.displayName}.`);
    }

    DB.saveUser(meData);
    DB.saveUser(target);
    Auth.currentUser = meData;
  },

  isFollowing(targetUsername) {
    return (Auth.currentUser.following || []).includes(targetUsername);
  },
};

/* ══════════════════════════════════════════════════════
   CREATE POST VIEW
══════════════════════════════════════════════════════ */
const CreatePost = {
  render() {
    const me = Auth.currentUser;
    const avatar = document.getElementById('create-avatar');
    const dnEl   = document.getElementById('create-displayname');
    if (avatar) Utils.setAvatar(avatar, me.displayName, me.username);
    if (dnEl) dnEl.textContent = me.displayName;

    // Char counter
    const textarea = document.getElementById('post-content');
    const counter  = document.getElementById('char-count');
    if (textarea && counter) {
      counter.textContent = textarea.value.length;
      textarea.oninput = function() {
        const len = this.value.length;
        counter.textContent = len;
        const wrap = counter.parentElement;
        wrap.className = 'char-counter' + (len > 450 ? ' danger' : len > 350 ? ' warn' : '');
      };
    }

    // Image URL preview
    const imgInput = document.getElementById('post-image-url');
    if (imgInput) {
      imgInput.oninput = function() {
        const url = this.value.trim();
        const wrap = document.getElementById('image-preview-wrap');
        const preview = document.getElementById('image-preview');
        if (url) {
          preview.src = url;
          preview.onload = () => wrap.classList.remove('hidden');
          preview.onerror = () => wrap.classList.add('hidden');
        } else {
          wrap.classList.add('hidden');
        }
      };
    }
  },
};

/* ══════════════════════════════════════════════════════
   PROFILE
══════════════════════════════════════════════════════ */
const Profile = {
  render(username) {
    const me = Auth.currentUser;
    const targetUsername = username || me.username;
    const user = DB.getUser(targetUsername);
    const container = document.getElementById('profile-content');

    if (!user) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><p>User not found.</p></div>`;
      return;
    }

    const isMe = targetUsername === me.username;
    const isFollowing = !isMe && Follow.isFollowing(targetUsername);

    const followers = (user.followers || []).length;
    const following = (user.following || []).length;

    // Get user's posts
    const posts = DB.getPosts()
      .filter(p => p.authorUsername === targetUsername)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const actionBtn = isMe
      ? `<button class="btn-outline" onclick="Profile.openEditModal()" aria-label="Edit your profile">Edit Profile</button>`
      : `<button
           class="btn-outline ${isFollowing ? 'following' : ''}"
           id="profile-follow-btn"
           onclick="Profile.toggleFollow('${targetUsername}')"
           aria-label="${isFollowing ? 'Unfollow' : 'Follow'} ${Utils.escapeHtml(user.displayName)}"
         >${isFollowing ? 'Following' : 'Follow'}</button>`;

    container.innerHTML = `
      <div class="profile-header">
        <div class="profile-top">
          <div class="profile-info">
            <div class="avatar xl" id="profile-avatar" data-username="${targetUsername}"></div>
            <div>
              <div class="profile-name">${Utils.escapeHtml(user.displayName)}</div>
              <div class="profile-handle">@${Utils.escapeHtml(user.username)}</div>
            </div>
          </div>
          ${actionBtn}
        </div>
        ${user.bio ? `<p class="profile-bio">${Utils.escapeHtml(user.bio)}</p>` : ''}
        <div class="profile-stats">
          <div class="profile-stat">
            <span class="stat-number">${posts.length}</span>
            <span class="stat-label">Posts</span>
          </div>
          <div class="profile-stat">
            <span class="stat-number">${followers}</span>
            <span class="stat-label">Followers</span>
          </div>
          <div class="profile-stat">
            <span class="stat-number">${following}</span>
            <span class="stat-label">Following</span>
          </div>
        </div>
      </div>

      <p class="profile-posts-title">Posts</p>
      <div class="post-list" id="profile-post-list">
        ${posts.length > 0
          ? posts.map(p => PostRenderer.buildCard(p)).join('')
          : '<div class="empty-state"><div class="empty-icon">◈</div><p>No posts yet.</p></div>'
        }
      </div>
    `;

    PostRenderer.paintAvatars(container);
  },

  toggleFollow(targetUsername) {
    Follow.toggle(targetUsername);
    const me = Auth.currentUser;
    const isNowFollowing = (me.following || []).includes(targetUsername);
    const btn = document.getElementById('profile-follow-btn');
    if (btn) {
      btn.textContent = isNowFollowing ? 'Following' : 'Follow';
      btn.classList.toggle('following', isNowFollowing);
    }
    // Re-render to update follower count
    Profile.render(targetUsername);
  },

  openEditModal() {
    const me = Auth.currentUser;
    Modal.open('Edit Profile', `
      <form class="edit-profile-form" onsubmit="Profile.saveEdit(event)" novalidate>
        <div class="field-group">
          <label for="edit-displayname">Display Name</label>
          <input id="edit-displayname" type="text" value="${Utils.escapeHtml(me.displayName)}" maxlength="40" required />
        </div>
        <div class="field-group">
          <label for="edit-bio">Bio <span class="label-optional">(optional)</span></label>
          <textarea id="edit-bio" rows="3" maxlength="160" placeholder="Tell us about yourself…">${Utils.escapeHtml(me.bio || '')}</textarea>
        </div>
        <p id="edit-error" class="form-error"></p>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
          <button type="button" class="btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn-primary">Save Changes</button>
        </div>
      </form>
    `);
  },

  saveEdit(e) {
    e.preventDefault();
    const displayName = Utils.sanitize(document.getElementById('edit-displayname').value);
    const bio         = Utils.sanitize(document.getElementById('edit-bio').value);
    const errEl       = document.getElementById('edit-error');

    if (!displayName) { errEl.textContent = 'Display name cannot be empty.'; return; }

    const me = DB.getUser(Auth.currentUser.username);
    me.displayName = displayName;
    me.bio = bio;
    DB.saveUser(me);
    Auth.currentUser = me;

    Modal.close();
    Sidebar.update();
    Profile.render(me.username);
    Toast.success('Profile updated!');
  },
};

/* ══════════════════════════════════════════════════════
   POST DETAIL
══════════════════════════════════════════════════════ */
const PostDetail = {
  render(postId) {
    const container = document.getElementById('post-detail-content');
    const post = DB.getPost(postId);

    if (!post) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><p>Post not found.</p></div>`;
      return;
    }

    const cardHtml = PostRenderer.buildCard(post, { showComments: true });
    container.innerHTML = cardHtml;
    PostRenderer.paintAvatars(container);

    // Focus comment input
    setTimeout(() => {
      const input = document.getElementById(`comment-input-${postId}`);
      if (input) input.focus();
    }, 100);
  },
};

/* ══════════════════════════════════════════════════════
   GLOBAL NAMESPACE — expose to HTML onclick attributes
══════════════════════════════════════════════════════ */
window.App = {
  Auth,
  Router,
  Feed,
  Discover,
  Posts,
  PostDetail,
  Profile,
  Follow,
  Modal,
};

// Also expose at top level for brevity in HTML
window.Router  = Router;
window.Posts   = Posts;
window.Profile = Profile;
window.Feed    = Feed;
window.Discover = Discover;

/* ══════════════════════════════════════════════════════
   CSS animation for deleted posts
══════════════════════════════════════════════════════ */
(function injectKeyframes() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeOut {
      from { opacity: 1; max-height: 500px; }
      to   { opacity: 0; max-height: 0; padding: 0; margin: 0; overflow: hidden; }
    }
  `;
  document.head.appendChild(style);
})();

/* ══════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();

  // Handle ?post=ID share links
  const params = new URLSearchParams(window.location.search);
  const sharedPost = params.get('post');
  if (sharedPost && Auth.currentUser) {
    Router.go('post-detail', { postId: sharedPost });
  }
});
