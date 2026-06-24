// ═══════════════════════════════════════════
// AUTH MODULE — login, register
// ═══════════════════════════════════════════

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('[type=submit]');
  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) return showToast('Please fill in all fields', 'error');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Signing in…';

  try {
    const { token, user } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    showToast(`Welcome back, ${user.firstName}! 👋`, 'success');

    const redirect = sessionStorage.getItem('redirect_after_login') || (user.isAdmin ? window.getAppPath('/admin/index.html') : window.getAppPath('/index.html'));
    sessionStorage.removeItem('redirect_after_login');
    setTimeout(() => window.location.href = redirect, 800);
  } catch (err) {
    showToast(err.message || 'Login failed', 'error');
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('[type=submit]');
  const firstName = form.firstName.value.trim();
  const lastName = form.lastName.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  const confirmPassword = form.confirmPassword.value;

  if (!firstName || !lastName || !email || !password) return showToast('All fields are required', 'error');
  if (password !== confirmPassword) return showToast('Passwords do not match', 'error');
  if (password.length < 6) return showToast('Password must be at least 6 characters', 'error');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating account…';

  try {
    const { token, user } = await api.post('/auth/register', { email, password, firstName, lastName });
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    showToast(`Welcome, ${user.firstName}! Account created 🎉`, 'success');
    setTimeout(() => window.location.href = window.getAppPath('/index.html'), 900);
  } catch (err) {
    showToast(err.message || 'Registration failed', 'error');
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

// If already logged in, redirect away from auth pages
function redirectIfLoggedIn() {
  if (localStorage.getItem('token')) window.location.href = window.getAppPath('/index.html');
}

window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.redirectIfLoggedIn = redirectIfLoggedIn;
