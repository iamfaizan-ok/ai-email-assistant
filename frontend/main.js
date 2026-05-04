const API_BASE = 'http://127.0.0.1:8000/api';

// State
let state = {
  token: localStorage.getItem('access_token'),
  user: null,
  emails: []
};

// DOM Elements
const els = {
  navLoginBtn: document.getElementById('nav-login-btn'),
  navSignupBtn: document.getElementById('nav-signup-btn'),
  navLogoutBtn: document.getElementById('nav-logout-btn'),
  navDashboardBtn: document.getElementById('nav-dashboard-btn'),
  
  views: {
    landing: document.getElementById('landing-page'),
    login: document.getElementById('login-page'),
    signup: document.getElementById('signup-page'),
    dashboard: document.getElementById('dashboard-page')
  },
  
  forms: {
    login: document.getElementById('login-form'),
    signup: document.getElementById('signup-form')
  },
  
  errors: {
    login: document.getElementById('login-error'),
    signup: document.getElementById('signup-error')
  },
  
  switches: {
    toSignup: document.getElementById('switch-to-signup'),
    toLogin: document.getElementById('switch-to-login')
  },
  
  dashboard: {
    emailsList: document.getElementById('emails-list'),
    refreshBtn: document.getElementById('refresh-emails')
  }
};

// Routing
function navigate(viewName) {
  Object.values(els.views).forEach(el => el.classList.remove('active'));
  els.views[viewName].classList.add('active');
  updateNav();
  
  if (viewName === 'dashboard' && state.token) {
    fetchEmails();
  }
}

function updateNav() {
  if (state.token) {
    els.navLoginBtn.classList.add('hidden');
    els.navSignupBtn.classList.add('hidden');
    els.navLogoutBtn.classList.remove('hidden');
    els.navDashboardBtn.classList.remove('hidden');
  } else {
    els.navLoginBtn.classList.remove('hidden');
    els.navSignupBtn.classList.remove('hidden');
    els.navLogoutBtn.classList.add('hidden');
    els.navDashboardBtn.classList.add('hidden');
  }
}

// Auth API Calls
async function login(email, password) {
  try {
    const res = await fetch(`${API_BASE}/users/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    
    if (res.ok) {
      state.token = data.access;
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      els.errors.login.innerText = '';
      navigate('dashboard');
    } else {
      els.errors.login.innerText = data.detail || 'Login failed. Check your credentials.';
    }
  } catch (err) {
    els.errors.login.innerText = 'Network error. Try again later.';
  }
}

async function signup(name, email, password, confirmPassword) {
  if (password !== confirmPassword) {
    els.errors.signup.innerText = 'Passwords do not match.';
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/users/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, confirm_password: confirmPassword })
    });
    const data = await res.json();
    
    if (res.ok) {
      state.token = data.access;
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      els.errors.signup.innerText = '';
      navigate('dashboard');
    } else {
      els.errors.signup.innerText = JSON.stringify(data);
    }
  } catch (err) {
    els.errors.signup.innerText = 'Network error. Try again later.';
  }
}

function logout() {
  state.token = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  navigate('landing');
}

// Dashboard API Calls
async function fetchEmails() {
  try {
    const res = await fetch(`${API_BASE}/emails/`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    
    if (res.status === 401) {
      logout();
      return;
    }
    
    const data = await res.json();
    state.emails = data;
    renderEmails();
  } catch (err) {
    console.error('Failed to fetch emails', err);
  }
}

function renderEmails() {
  els.dashboard.emailsList.innerHTML = '';
  
  if (state.emails.length === 0) {
    els.dashboard.emailsList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">No important emails yet. Make sure the extension is running!</p>';
    return;
  }
  
  state.emails.forEach(email => {
    const card = document.createElement('div');
    card.className = 'email-card';
    card.innerHTML = `
      <span class="badge">${email.category || 'Important'}</span>
      <div class="email-subject">${email.subject}</div>
      <div class="email-sender">${email.sender}</div>
      <div class="email-snippet">${email.snippet}</div>
      <div class="email-date">${new Date(email.received_at).toLocaleString()}</div>
    `;
    els.dashboard.emailsList.appendChild(card);
  });
}

// Event Listeners
els.navLoginBtn.addEventListener('click', () => navigate('login'));
els.navSignupBtn.addEventListener('click', () => navigate('signup'));
els.navLogoutBtn.addEventListener('click', () => logout());
els.navDashboardBtn.addEventListener('click', () => navigate('dashboard'));
document.querySelector('.logo').addEventListener('click', () => navigate(state.token ? 'dashboard' : 'landing'));

els.switches.toSignup.addEventListener('click', (e) => { e.preventDefault(); navigate('signup'); });
els.switches.toLogin.addEventListener('click', (e) => { e.preventDefault(); navigate('login'); });

els.forms.login.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-password').value;
  login(email, pass);
});

els.forms.signup.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const pass = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm-password').value;
  signup(name, email, pass, confirm);
});

els.dashboard.refreshBtn.addEventListener('click', fetchEmails);

// Init
function init() {
  updateNav();
  if (state.token) {
    navigate('dashboard');
  } else {
    navigate('landing');
  }
}

init();
