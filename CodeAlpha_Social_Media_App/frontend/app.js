/* ═══════════════════════════════════════════════════════════════════════
   NEXUS — SOCIAL MEDIA APP · frontend/app.js
   Full-stack version: all data fetched from Express REST API.
   Token stored in localStorage; same UI as before — zero visual change.
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════
   API — thin fetch wrapper
   Since Express serves this file, API_BASE is '' (same origin)
══════════════════════════════════════════════════════ */
const API_BASE = '';

const api = {
  async _req(method, path, body = null) {
    const token = localStorage.getItem('nexus_token');
    const opts  = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    if (body !== null) opts.body = JSON.stringify(body);

    const res  = await fetch(API_BASE + path, opts);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  },

  get:  (path)        => api._req('GET',    path),
  post: (path, body)  => api._req('POST',   path, body),
  put:  (path, body)  => api._req('PUT',    path, body),
  del:  (path)        => api._req('DELETE', path),
};

/* ══════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════ */
const Utils = {
  timeAgo(isoString) {
    const diff = (Date.now() - new Date(isoString)) / 1000;
    if (diff < 60)     return 'just now';
    if (diff < 3600)   return Math.floor(diff / 60)    + 'm ago';
    if (diff < 86400)  return Math.floor(diff / 3600)  + 'h ago';
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

  avatarColor(username = '') {
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
    el.textContent         = Utils.initials(displayName);
    el.style.background    = Utils.avatarColor(username || displayName);
    el.style.borderColor   = 'transparent';
  },

  sanitize: (str) => String(str || '').trim(),

  /* Inline avatar HTML — used in templates to avoid a second paint pass */
  avatarHtml(displayName, username, sizeClass = 'sm', extra = '') {
    const bg = Utils.avatarColor(username);
    const tx = Utils.escapeHtml(Utils.initials(displayName));
    return `<div class="avatar ${sizeClass}" style="background:${bg};border-color:transparent;${extra}">${tx}</div>`;
  },
};

/* ══════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════════════════════ */
const Toast = {
  show(msg, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast     = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.25s ease forwards';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },
  success: (msg) => Toast.show(msg, 'success'),
  error:   (msg) => Toast.show(msg, 'error'),
};

/* ══════════════════════════════════════════════════════
   MODAL
══════════════════════════════════════════════════════ */
const Modal = {
  open(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML    = bodyHtml;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.addEventListener('keydown', Modal._escHandler);
  },
  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
    document.removeEventListener('keydown', Modal._escHandler);
  },
  _escHandler(e) { if (e.key === 'Escape') Modal.close(); },
};

document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) Modal.close();
});

/* ══════════════════════════════════════════════════════
   ROUTER
══════════════════════════════════════════════════════ */
const Router = {
  current:  'feed',
  _history: [],

  async go(page, data = {}) {
    const pages = ['feed', 'discover', 'create', 'profile', 'post-detail'];
    pages.forEach(p => {
      const el = document.getElementById(`page-${p}`);
      if (el) el.classList.toggle('hidden', p !== page);
    });

    /* Nav highlight */
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.remove('active'));
    const navKey = ['feed','discover','create','profile'].find(k => page.startsWith(k));
    if (navKey) {
      document.getElementById(`nav-${navKey}`)?.classList.add('active');
      document.getElementById(`mnav-${navKey}`)?.classList.add('active');
    }

    Router._history.push({ page: Router.current, data: {} });
    Router.current = page;

    switch (page) {
      case 'feed':        await Feed.render();                        break;
      case 'discover':    await Discover.render();                    break;
      case 'create':           CreatePost.render();                   break;
      case 'profile':     await Profile.render(data.username || null); break;
      case 'post-detail': await PostDetail.render(data.postId);       break;
    }

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

  async init() {
    const token = localStorage.getItem('nexus_token');
    if (token) {
      try {
        const { user } = await api.get('/api/auth/me');
        Auth.currentUser = user;
        Auth._showApp();
        return;
      } catch {
        /* Token invalid / expired — fall through to login */
        localStorage.removeItem('nexus_token');
      }
    }
    Auth._showAuth();
  },

  switchTab(tab) {
    document.getElementById('form-login')   .classList.toggle('hidden', tab !== 'login');
    document.getElementById('form-register').classList.toggle('hidden', tab !== 'register');
    document.getElementById('tab-login')    .classList.toggle('active', tab === 'login');
    document.getElementById('tab-register') .classList.toggle('active', tab === 'register');
    document.getElementById('tab-login')    .setAttribute('aria-selected', tab === 'login');
    document.getElementById('tab-register') .setAttribute('aria-selected', tab === 'register');
  },

  async login(e) {
    e.preventDefault();
    const username = Utils.sanitize(document.getElementById('login-username').value);
    const password = document.getElementById('login-password').value;
    const errEl    = document.getElementById('login-error');
    errEl.textContent = '';

    if (!username || !password) { errEl.textContent = 'Please fill in all fields.'; return; }

    const btn = document.getElementById('login-submit-btn');
    btn.disabled = true;
    try {
      const { user, token } = await api.post('/api/auth/login', { username, password });
      localStorage.setItem('nexus_token', token);
      Auth.currentUser = user;
      Auth._showApp();
      Toast.success(`Welcome back, ${user.displayName}!`);
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  },

  async register(e) {
    e.preventDefault();
    const displayName = Utils.sanitize(document.getElementById('reg-displayname').value);
    const username    = Utils.sanitize(document.getElementById('reg-username').value).toLowerCase();
    const bio         = Utils.sanitize(document.getElementById('reg-bio').value);
    const password    = document.getElementById('reg-password').value;
    const errEl       = document.getElementById('register-error');
    errEl.textContent = '';

    if (!displayName || !username || !password) {
      errEl.textContent = 'Please fill in all required fields.'; return;
    }

    const btn = document.getElementById('register-submit-btn');
    btn.disabled = true;
    try {
      const { user, token } = await api.post('/api/auth/register', { displayName, username, bio, password });
      localStorage.setItem('nexus_token', token);
      Auth.currentUser = user;
      Auth._showApp();
      Toast.success(`Account created! Welcome, ${user.displayName}!`);
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  },

  logout() {
    Auth.currentUser = null;
    localStorage.removeItem('nexus_token');
    document.getElementById('view-app') .classList.add('hidden');
    document.getElementById('view-auth').classList.remove('hidden');
    Auth.switchTab('login');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').textContent = '';
  },

  _showAuth() {
    document.getElementById('view-auth').classList.remove('hidden');
    document.getElementById('view-auth').classList.add('active');
    document.getElementById('view-app') .classList.add('hidden');
  },

  _showApp() {
    document.getElementById('view-auth').classList.add('hidden');
    document.getElementById('view-auth').classList.remove('active');
    document.getElementById('view-app') .classList.remove('hidden');
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
    document.getElementById('sidebar-handle').textContent      = '@' + user.username;
  },
};

/* ══════════════════════════════════════════════════════
   POST RENDERER — pure HTML builders (no DOM reads)
══════════════════════════════════════════════════════ */
const PostRenderer = {
  /* Build a single post card.
     post = { id, content, imageUrl, createdAt, likeCount, commentCount, isLiked,
               author: { username, displayName } }
  */
  buildCard(post, opts = {}) {
    const { showComments = false } = opts;
    const me    = Auth.currentUser;
    const isOwn = post.author.username === me.username;

    const imageHtml = post.imageUrl
      ? `<img src="${Utils.escapeHtml(post.imageUrl)}" alt="Post image" class="post-image" onerror="this.style.display='none'" />`
      : '';

    const deleteBtn = isOwn
      ? `<button class="btn-danger" onclick="Posts.delete('${post.id}')" aria-label="Delete post">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
             <polyline points="3 6 5 6 21 6"/>
             <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
           </svg>
         </button>`
      : '';

    const commentBtn = !showComments
      ? `<button class="post-action-btn" onclick="Router.go('post-detail',{postId:'${post.id}'})" aria-label="View ${post.commentCount} comments">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
             <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
           </svg>
           <span class="action-count comment-count-${post.id}">${post.commentCount}</span>
         </button>`
      : '';

    const authorAvatar = Utils.avatarHtml(
      post.author.displayName, post.author.username, 'sm',
      'cursor:pointer;flex-shrink:0'
    );

    return `
      <article class="post-card" id="post-${post.id}" role="listitem">
        <div class="post-header">
          <div class="post-author-info">
            <div onclick="Router.go('profile',{username:'${post.author.username}'})" title="View profile">
              ${authorAvatar}
            </div>
            <div class="post-author-text">
              <span class="post-author-name" onclick="Router.go('profile',{username:'${post.author.username}'})">
                ${Utils.escapeHtml(post.author.displayName)}
              </span>
              <span class="post-author-handle">@${Utils.escapeHtml(post.author.username)}</span>
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
            class="post-action-btn ${post.isLiked ? 'liked' : ''}"
            id="like-btn-${post.id}"
            onclick="Posts.toggleLike('${post.id}', this)"
            aria-label="${post.isLiked ? 'Unlike' : 'Like'} this post"
            aria-pressed="${post.isLiked}"
          >
            <svg width="16" height="16" viewBox="0 0 24 24"
              fill="${post.isLiked ? 'currentColor' : 'none'}"
              stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span class="action-count like-count-${post.id}">${post.likeCount}</span>
          </button>

          ${commentBtn}

          <div class="post-actions-right">
            <button class="post-action-btn" onclick="Posts.share('${post.id}')" aria-label="Share post">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
          </div>
        </div>
      </article>
    `;
  },

  /* Build the inline comments section for PostDetail */
  buildCommentsSection(postId, comments) {
    const me = Auth.currentUser;

    const items = comments.map(c => {
      const isOwn = c.author.username === me.username;
      return `
        <div class="comment-item" id="comment-${c.id}">
          <div style="cursor:pointer;flex-shrink:0"
               onclick="Router.go('profile',{username:'${c.author.username}'})"
               title="View profile">
            ${Utils.avatarHtml(c.author.displayName, c.author.username, 'sm')}
          </div>
          <div class="comment-body">
            <div class="comment-author">${Utils.escapeHtml(c.author.displayName)}</div>
            <div class="comment-text">${Utils.escapeHtml(c.text)}</div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="comment-time">${Utils.timeAgo(c.createdAt)}</span>
              ${isOwn
                ? `<button class="btn-danger" style="padding:0 4px;font-size:0.7rem"
                           onclick="Posts.deleteComment('${postId}','${c.id}')"
                           aria-label="Delete comment">Delete</button>`
                : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <h3 class="comments-title" id="comments-title-${postId}">Comments (${comments.length})</h3>
      <div id="comment-list-${postId}">
        ${items || '<p style="font-size:0.85rem;color:var(--text-muted)">No comments yet.</p>'}
      </div>
      <div class="comment-form">
        ${Utils.avatarHtml(me.displayName, me.username, 'sm', 'flex-shrink:0')}
        <div class="comment-input-wrap">
          <input
            class="comment-input"
            id="comment-input-${postId}"
            type="text"
            placeholder="Add a comment…"
            maxlength="280"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();Posts.submitComment('${postId}')}"
            aria-label="Write a comment"
          />
          <button class="comment-submit-btn"
                  onclick="Posts.submitComment('${postId}')"
                  aria-label="Submit comment">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  },
};

/* ══════════════════════════════════════════════════════
   POSTS — actions
══════════════════════════════════════════════════════ */
const Posts = {
  async toggleLike(postId, btn) {
    btn.disabled = true;
    try {
      const { liked, likeCount } = await api.post(`/api/posts/${postId}/like`);

      btn.classList.toggle('liked', liked);
      btn.setAttribute('aria-pressed', liked);
      btn.setAttribute('aria-label', liked ? 'Unlike this post' : 'Like this post');
      btn.querySelector('svg').setAttribute('fill', liked ? 'currentColor' : 'none');

      document.querySelectorAll(`.like-count-${postId}`).forEach(el => {
        el.textContent = likeCount;
      });
    } catch (err) {
      Toast.error(err.message);
    } finally {
      btn.disabled = false;
    }
  },

  async delete(postId) {
    if (!confirm('Delete this post?')) return;
    try {
      await api.del(`/api/posts/${postId}`);
      const el = document.getElementById(`post-${postId}`);
      if (el) {
        el.style.animation = 'fadeOut 0.2s ease forwards';
        setTimeout(() => el.remove(), 200);
      }
      Toast.success('Post deleted.');
      if (Router.current === 'post-detail') Router.go('feed');
    } catch (err) {
      Toast.error(err.message);
    }
  },

  async create(e) {
    e.preventDefault();
    const content  = Utils.sanitize(document.getElementById('post-content').value);
    const imageUrl = Utils.sanitize(document.getElementById('post-image-url').value);
    const errEl    = document.getElementById('create-error');
    errEl.textContent = '';

    if (!content) { errEl.textContent = 'Post content cannot be empty.'; return; }
    if (content.length > 500) { errEl.textContent = 'Post is too long (max 500 chars).'; return; }

    const btn = document.getElementById('publish-btn');
    btn.disabled = true;
    try {
      await api.post('/api/posts', { content, imageUrl });

      document.getElementById('post-content').value   = '';
      document.getElementById('post-image-url').value = '';
      document.getElementById('char-count').textContent = '0';
      document.getElementById('image-preview-wrap').classList.add('hidden');

      Toast.success('Post published!');
      Router.go('feed');
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  },

  removeImagePreview() {
    document.getElementById('post-image-url').value = '';
    document.getElementById('image-preview-wrap').classList.add('hidden');
  },

  async submitComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const text  = Utils.sanitize(input.value);
    if (!text) return;

    try {
      const { commentCount } = await api.post(`/api/posts/${postId}/comments`, { text });
      input.value = '';

      /* Re-fetch all comments and re-render the list */
      const comments = await api.get(`/api/posts/${postId}/comments`);
      Posts._reRenderCommentList(postId, comments, commentCount);
    } catch (err) {
      Toast.error(err.message);
    }
  },

  async deleteComment(postId, commentId) {
    try {
      const { commentCount } = await api.del(`/api/posts/${postId}/comments/${commentId}`);

      /* Remove item from DOM */
      document.getElementById(`comment-${commentId}`)?.remove();

      /* Update title */
      const titleEl = document.getElementById(`comments-title-${postId}`);
      if (titleEl) titleEl.textContent = `Comments (${commentCount})`;

      /* Empty state */
      const listEl = document.getElementById(`comment-list-${postId}`);
      if (listEl && !listEl.querySelector('.comment-item')) {
        listEl.innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted)">No comments yet.</p>';
      }

      /* Feed count */
      document.querySelectorAll(`.comment-count-${postId}`).forEach(el => {
        el.textContent = commentCount;
      });

      Toast.success('Comment deleted.');
    } catch (err) {
      Toast.error(err.message);
    }
  },

  /* Re-render comment list after add/delete */
  _reRenderCommentList(postId, comments, commentCount) {
    const me     = Auth.currentUser;
    const listEl = document.getElementById(`comment-list-${postId}`);
    if (!listEl) return;

    listEl.innerHTML = comments.map(c => {
      const isOwn = c.author.username === me.username;
      return `
        <div class="comment-item" id="comment-${c.id}">
          <div style="cursor:pointer;flex-shrink:0"
               onclick="Router.go('profile',{username:'${c.author.username}'})">
            ${Utils.avatarHtml(c.author.displayName, c.author.username, 'sm')}
          </div>
          <div class="comment-body">
            <div class="comment-author">${Utils.escapeHtml(c.author.displayName)}</div>
            <div class="comment-text">${Utils.escapeHtml(c.text)}</div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="comment-time">${Utils.timeAgo(c.createdAt)}</span>
              ${isOwn
                ? `<button class="btn-danger" style="padding:0 4px;font-size:0.7rem"
                           onclick="Posts.deleteComment('${postId}','${c.id}')"
                           aria-label="Delete comment">Delete</button>`
                : ''}
            </div>
          </div>
        </div>
      `;
    }).join('') || '<p style="font-size:0.85rem;color:var(--text-muted)">No comments yet.</p>';

    const titleEl = document.getElementById(`comments-title-${postId}`);
    if (titleEl) titleEl.textContent = `Comments (${commentCount})`;

    document.querySelectorAll(`.comment-count-${postId}`).forEach(el => {
      el.textContent = commentCount;
    });
  },

  share(postId) {
    const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
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

  async render()        { await Feed._renderList(); },

  async switchTab(tab) {
    Feed._tab = tab;
    document.getElementById('ftab-following').classList.toggle('active', tab === 'following');
    document.getElementById('ftab-all')      .classList.toggle('active', tab === 'all');
    await Feed._renderList();
  },

  async _renderList() {
    const container = document.getElementById('feed-list');
    container.innerHTML = `<div class="empty-state"><div class="empty-icon" style="animation:spin 1.2s linear infinite">◌</div><p>Loading…</p></div>`;

    try {
      const posts = await api.get(`/api/posts?tab=${Feed._tab}`);

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
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠</div>
          <p>Failed to load posts.<br><small>${Utils.escapeHtml(err.message)}</small></p>
        </div>`;
    }
  },
};

/* ══════════════════════════════════════════════════════
   DISCOVER
══════════════════════════════════════════════════════ */
const Discover = {
  async render() {
    document.getElementById('discover-search').value = '';
    await Discover._renderUsers('');
  },

  async search(query) {
    clearTimeout(Discover._timer);
    Discover._timer = setTimeout(() => Discover._renderUsers(query.trim()), 250);
  },

  async _renderUsers(query) {
    const container = document.getElementById('discover-list');
    try {
      const users = await api.get(`/api/users${query ? `?search=${encodeURIComponent(query)}` : ''}`);

      if (users.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><p>No users found.</p></div>`;
        return;
      }

      container.innerHTML = users.map(u => `
        <div class="user-card" id="ucard-${u.username}">
          <div onclick="Router.go('profile',{username:'${u.username}'})" style="cursor:pointer" title="View profile">
            ${Utils.avatarHtml(u.displayName, u.username, 'md')}
          </div>
          <div class="user-card-info">
            <div class="user-card-name" onclick="Router.go('profile',{username:'${u.username}'})">
              ${Utils.escapeHtml(u.displayName)}
            </div>
            <div class="user-card-handle">@${Utils.escapeHtml(u.username)}</div>
            ${u.bio ? `<div class="user-card-bio">${Utils.escapeHtml(u.bio)}</div>` : ''}
          </div>
          <button
            class="btn-outline ${u.isFollowing ? 'following' : ''}"
            id="follow-btn-${u.username}"
            onclick="Discover.toggleFollow('${u.username}')"
            aria-label="${u.isFollowing ? 'Unfollow' : 'Follow'} ${Utils.escapeHtml(u.displayName)}"
          >${u.isFollowing ? 'Following' : 'Follow'}</button>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠</div><p>Failed to load users.</p></div>`;
    }
  },

  async toggleFollow(targetUsername) {
    try {
      const { following } = await api.post(`/api/users/${targetUsername}/follow`);
      const btn = document.getElementById(`follow-btn-${targetUsername}`);
      if (btn) {
        btn.textContent = following ? 'Following' : 'Follow';
        btn.classList.toggle('following', following);
      }
    } catch (err) {
      Toast.error(err.message);
    }
  },
};

/* ══════════════════════════════════════════════════════
   CREATE POST
══════════════════════════════════════════════════════ */
const CreatePost = {
  render() {
    const me = Auth.currentUser;
    const avatar = document.getElementById('create-avatar');
    const dnEl   = document.getElementById('create-displayname');

    if (avatar) Utils.setAvatar(avatar, me.displayName, me.username);
    if (dnEl)   dnEl.textContent = me.displayName;

    /* Char counter */
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

    /* Image URL live preview */
    const imgInput = document.getElementById('post-image-url');
    if (imgInput) {
      imgInput.oninput = function() {
        const url    = this.value.trim();
        const wrap   = document.getElementById('image-preview-wrap');
        const preview = document.getElementById('image-preview');
        if (url) {
          preview.src     = url;
          preview.onload  = () => wrap.classList.remove('hidden');
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
  async render(username) {
    const me              = Auth.currentUser;
    const targetUsername  = username || me.username;
    const container       = document.getElementById('profile-content');
    container.innerHTML   = `<div class="empty-state"><div class="empty-icon" style="animation:spin 1.2s linear infinite">◌</div><p>Loading…</p></div>`;

    try {
      const [user, posts] = await Promise.all([
        api.get(`/api/users/${targetUsername}`),
        api.get(`/api/posts?author=${targetUsername}`),
      ]);

      const actionBtn = user.isMe
        ? `<button class="btn-outline" onclick="Profile.openEditModal()" aria-label="Edit your profile">Edit Profile</button>`
        : `<button
             class="btn-outline ${user.isFollowing ? 'following' : ''}"
             id="profile-follow-btn"
             onclick="Profile.toggleFollow('${targetUsername}')"
             aria-label="${user.isFollowing ? 'Unfollow' : 'Follow'} ${Utils.escapeHtml(user.displayName)}"
           >${user.isFollowing ? 'Following' : 'Follow'}</button>`;

      container.innerHTML = `
        <div class="profile-header">
          <div class="profile-top">
            <div class="profile-info">
              ${Utils.avatarHtml(user.displayName, user.username, 'xl')}
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
              <span class="stat-number">${user.postCount}</span>
              <span class="stat-label">Posts</span>
            </div>
            <div class="profile-stat">
              <span class="stat-number" id="profile-follower-count">${user.followerCount}</span>
              <span class="stat-label">Followers</span>
            </div>
            <div class="profile-stat">
              <span class="stat-number">${user.followingCount}</span>
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
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><p>User not found.</p></div>`;
    }
  },

  async toggleFollow(targetUsername) {
    try {
      const { following, followerCount } = await api.post(`/api/users/${targetUsername}/follow`);
      const btn = document.getElementById('profile-follow-btn');
      if (btn) {
        btn.textContent = following ? 'Following' : 'Follow';
        btn.classList.toggle('following', following);
      }
      const countEl = document.getElementById('profile-follower-count');
      if (countEl) countEl.textContent = followerCount;
    } catch (err) {
      Toast.error(err.message);
    }
  },

  openEditModal() {
    const me = Auth.currentUser;
    Modal.open('Edit Profile', `
      <form class="edit-profile-form" onsubmit="Profile.saveEdit(event)" novalidate>
        <div class="field-group">
          <label for="edit-displayname">Display Name</label>
          <input id="edit-displayname" type="text"
                 value="${Utils.escapeHtml(me.displayName)}"
                 maxlength="40" required />
        </div>
        <div class="field-group">
          <label for="edit-bio">Bio <span class="label-optional">(optional)</span></label>
          <textarea id="edit-bio" rows="3" maxlength="160"
                    placeholder="Tell us about yourself…">${Utils.escapeHtml(me.bio || '')}</textarea>
        </div>
        <p id="edit-error" class="form-error"></p>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
          <button type="button" class="btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn-primary" id="edit-save-btn">Save Changes</button>
        </div>
      </form>
    `);
  },

  async saveEdit(e) {
    e.preventDefault();
    const displayName = Utils.sanitize(document.getElementById('edit-displayname').value);
    const bio         = Utils.sanitize(document.getElementById('edit-bio').value);
    const errEl       = document.getElementById('edit-error');

    if (!displayName) { errEl.textContent = 'Display name cannot be empty.'; return; }

    const btn = document.getElementById('edit-save-btn');
    btn.disabled = true;
    try {
      const user = await api.put('/api/users/me', { displayName, bio });
      Auth.currentUser = { ...Auth.currentUser, displayName: user.displayName, bio: user.bio };
      Modal.close();
      Sidebar.update();
      await Profile.render(Auth.currentUser.username);
      Toast.success('Profile updated!');
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  },
};

/* ══════════════════════════════════════════════════════
   POST DETAIL
══════════════════════════════════════════════════════ */
const PostDetail = {
  async render(postId) {
    const container = document.getElementById('post-detail-content');
    container.innerHTML = `<div class="empty-state"><div class="empty-icon" style="animation:spin 1.2s linear infinite">◌</div><p>Loading…</p></div>`;

    try {
      const [post, comments] = await Promise.all([
        api.get(`/api/posts/${postId}`),
        api.get(`/api/posts/${postId}/comments`),
      ]);

      container.innerHTML = PostRenderer.buildCard(post, { showComments: true });

      /* Append comments section inside the article */
      const article = container.querySelector(`#post-${postId}`);
      if (article) {
        const section = document.createElement('div');
        section.className = 'comments-section';
        section.id        = `comments-${postId}`;
        section.innerHTML = PostRenderer.buildCommentsSection(postId, comments);
        article.appendChild(section);
      }

      /* Auto-focus comment input */
      setTimeout(() => {
        document.getElementById(`comment-input-${postId}`)?.focus();
      }, 100);
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><p>Post not found.</p></div>`;
    }
  },
};

/* ══════════════════════════════════════════════════════
   GLOBAL NAMESPACE (required by HTML onclick attributes)
══════════════════════════════════════════════════════ */
window.App = { Auth, Router, Feed, Discover, Posts, PostDetail, Profile, Modal };

/* Also expose at top-level for brevity in inline event handlers */
window.Router   = Router;
window.Posts    = Posts;
window.Profile  = Profile;
window.Feed     = Feed;
window.Discover = Discover;

/* ══════════════════════════════════════════════════════
   INJECT KEYFRAMES
══════════════════════════════════════════════════════ */
(function injectKeyframes() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeOut {
      from { opacity:1; max-height:500px; }
      to   { opacity:0; max-height:0; padding:0; margin:0; overflow:hidden; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
})();

/* ══════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  await Auth.init();

  /* Handle ?post=ID share links */
  const sharedPost = new URLSearchParams(window.location.search).get('post');
  if (sharedPost && Auth.currentUser) {
    Router.go('post-detail', { postId: sharedPost });
  }
});
