const form = document.querySelector('#signupForm');
const toast = document.querySelector('#toast');
const submitBtn = document.querySelector('#submitBtn');
let toastTimer;
let mode = 'signup';

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
function setError(input, message) {
  const field = input.closest('.field');
  field.classList.toggle('invalid', Boolean(message));
  field.querySelector('.error').textContent = message || '';
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
}
function validateField(input) {
  const value = input.value.trim();
  let message = '';
  if (input.required && !value) message = 'This field is required.';
  else if (input.id === 'fullName' && value.length < 2) message = 'Please enter your full name.';
  else if (input.id === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = 'Enter a valid email address.';
  else if (input.id === 'phone' && !/^[+\d][\d\s().-]{7,17}$/.test(value)) message = 'Enter a valid phone number.';
  else if (input.id === 'password' && value.length < 8) message = 'Use at least 8 characters.';
  else if (input.id === 'confirmPassword' && value !== document.querySelector('#password').value) message = 'Passwords do not match.';
  setError(input, message);
  return !message;
}

form.querySelectorAll('input:not([type="checkbox"])').forEach(input => {
  input.addEventListener('blur', () => validateField(input));
  input.addEventListener('input', () => {
    if (input.closest('.field').classList.contains('invalid')) validateField(input);
    if (input.id === 'password' && document.querySelector('#confirmPassword').value) validateField(document.querySelector('#confirmPassword'));
  });
});

document.querySelectorAll('.visibility-toggle').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.target);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.setAttribute('aria-label', `${show ? 'Hide' : 'Show'} ${button.dataset.target === 'password' ? 'password' : 'confirm password'}`);
  });
});

const params = new URLSearchParams(window.location.search);
const NEXT = (() => { const n = params.get('next') || ''; return /^\/[^/\\]/.test(n) ? n : ''; })();   // only same-site paths
const field = id => document.getElementById(id).closest('.field');
const setBusy = (on, label) => { submitBtn.disabled = on; if (label) submitBtn.querySelector('span').textContent = label; };
function applyServerErrors(err) {
  const map = { fullName: 'fullName', email: 'email', phone: 'phone', password: 'password', confirmPassword: 'confirmPassword' };
  if (err.field && map[err.field]) { setError(document.getElementById(map[err.field]), err.message); document.getElementById(map[err.field]).focus(); }
  else if (err.field === 'terms') document.querySelector('#termsError').textContent = err.message;
  else showToast(err.message);
}
function done(user) {
  showToast(mode === 'signup' ? `Welcome to TrackB, ${user.name.split(' ')[0]}!` : `Welcome back, ${user.name.split(' ')[0]}!`);
  setTimeout(() => { location.href = NEXT || '../index.html'; }, 700);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const g = id => document.getElementById(id).value.trim();
  if (mode === 'forgot') {
    if (!validateField(document.querySelector('#email'))) return;
    setBusy(true);
    try {
      const r = await SB.post('/auth/forgot', { email: g('email') });
      showToast(r.message);
      if (r.devLink) { const a = document.createElement('a'); a.href = '..' + r.devLink; a.textContent = 'Development mode: open the reset link'; a.className = 'text-link'; a.style.display = 'block'; a.style.marginTop = '10px'; document.querySelector('#termsError').after(a); }
    } catch (e) { showToast(e.message); }
    setBusy(false); return;
  }
  if (mode === 'reset') {
    const ok = validateField(document.querySelector('#password')) & validateField(document.querySelector('#confirmPassword'));
    if (!ok) return;
    setBusy(true);
    try { await SB.post('/auth/reset', { token: params.get('token'), password: document.querySelector('#password').value }); showToast('Password updated. Please log in.'); setTimeout(() => { location.href = 'index.html?mode=login'; }, 1200); }
    catch (e) { showToast(e.message); setBusy(false); }
    return;
  }
  if (mode === 'login') {
    const valid = validateField(document.querySelector('#email')) & validateField(document.querySelector('#password'));
    if (!valid) return;
    setBusy(true, 'Logging in…');
    try { const r = await SB.post('/auth/login', { email: g('email'), password: document.querySelector('#password').value }); done(r.user); }
    catch (e) { applyServerErrors(e); setBusy(false, 'Log In'); }
    return;
  }
  const fields = [...form.querySelectorAll('input:not([type="checkbox"])')];
  const validFields = fields.map(validateField).every(Boolean);
  const terms = document.querySelector('#terms');
  document.querySelector('#termsError').textContent = terms.checked ? '' : 'Please accept the terms to continue.';
  if (!validFields || !terms.checked) {
    if (!terms.checked) terms.focus();
    const firstInvalid = form.querySelector('.field.invalid input');
    if (firstInvalid) firstInvalid.focus();
    return;
  }
  setBusy(true, 'Creating account…');
  try {
    const r = await SB.post('/auth/signup', { fullName: g('fullName'), email: g('email'), phone: g('phone'), password: document.querySelector('#password').value,
      confirmPassword: document.querySelector('#confirmPassword').value, terms: true });
    done(r.user);
  } catch (e) { applyServerErrors(e); setBusy(false, 'Create Account'); }
});

document.querySelector('#terms').addEventListener('change', () => {
  if (document.querySelector('#terms').checked) document.querySelector('#termsError').textContent = '';
});

function fieldsClear() {
  form.querySelectorAll('.field').forEach(field => { field.classList.remove('invalid'); field.querySelector('.error').textContent = ''; });
}
function setMode(next) {
  mode = next;
  const login = mode === 'login', forgot = mode === 'forgot', reset = mode === 'reset', signup = mode === 'signup';
  field('fullName').hidden = !signup;
  field('phone').hidden = !signup;
  field('email').hidden = reset;
  field('password').hidden = forgot;
  field('confirmPassword').hidden = !(signup || reset);
  document.querySelector('.terms-row').hidden = !signup;
  document.querySelector('.separator').hidden = forgot || reset;
  document.querySelector('.social-row').hidden = forgot || reset;
  document.querySelector('#formTitle').textContent = { signup: 'Create Your Account', login: 'Welcome Back', forgot: 'Forgot Password', reset: 'Set a New Password' }[mode];
  document.querySelector('#formSubtitle').textContent = { signup: 'Join TrackB and start your smart travel journey today.', login: 'Log in to continue your TrackB journey.',
    forgot: 'Enter your email and we will send you a reset link.', reset: 'Choose a new password for your account.' }[mode];
  document.querySelector('.separator p').textContent = login ? 'or log in with' : 'or sign up with';
  submitBtn.querySelector('span').textContent = { signup: 'Create Account', login: 'Log In', forgot: 'Send Reset Link', reset: 'Update Password' }[mode];
  document.querySelector('#loginPrompt').innerHTML = signup ? 'Already have an account? <button type="button" id="loginLink">Log in</button>'
    : login ? 'New to TrackB? <button type="button" id="loginLink">Create account</button>' : 'Back to <button type="button" id="loginLink">Log in</button>';
  document.querySelector('#password').autocomplete = login ? 'current-password' : 'new-password';
  document.querySelector('#password').placeholder = reset ? 'Create a new password' : login ? 'Enter your password' : 'Create a password';
  let fr = document.getElementById('forgotRow');
  if (!fr) { fr = document.createElement('p'); fr.id = 'forgotRow'; fr.style.cssText = 'text-align:right;margin:-4px 0 12px'; fr.innerHTML = '<button type="button" class="text-link" id="forgotBtn" style="background:none;border:0;cursor:pointer;font:inherit">Forgot password?</button>'; submitBtn.before(fr); }
  fr.hidden = !login;
  document.querySelector('#termsError').textContent = '';
  fieldsClear();
}
document.addEventListener('click', event => {
  if (event.target.closest('#forgotBtn')) setMode('forgot');
  else if (event.target.closest('#loginLink')) setMode(mode === 'signup' ? 'login' : 'signup');
});

document.querySelectorAll('[data-provider]').forEach(button => button.addEventListener('click', async () => {
  try { await SB.post('/auth/social', {}); } catch (e) { showToast(`${button.dataset.provider}: ${e.message}`); }
}));
// Terms / Privacy open the real policy pages in a new tab (the form keeps its values).
document.querySelectorAll('[data-info]').forEach(link => {
  link.setAttribute('href', '../pages/' + (/Terms/.test(link.dataset.info) ? 'terms' : 'privacy') + '.html');
  link.setAttribute('target', '_blank'); link.setAttribute('rel', 'noopener');
});

// Already logged in? Go straight on. Otherwise open the requested view (?mode=login | signup | reset).
SB.ready.then(user => {
  if (user && params.get('mode') !== 'reset') { location.replace(NEXT || '../index.html'); return; }
  const m = params.get('mode');
  setMode(m === 'login' ? 'login' : m === 'reset' && params.get('token') ? 'reset' : 'signup');
  if (NEXT && m !== 'reset') showToast('Please log in to continue.');
});
