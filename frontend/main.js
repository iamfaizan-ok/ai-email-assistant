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
  navLogoutBtn: document.getElementById('nav-logout-btn'),
  navDashboardBtn: document.getElementById('nav-dashboard-btn'),
  
  views: {
    landing: document.getElementById('landing-page'),
    auth: document.getElementById('auth-page'),
    dashboard: document.getElementById('dashboard-page')
  },
  
  heroActions: document.getElementById('hero-actions'),
  heroAuthPrompt: document.getElementById('hero-auth-prompt'),
  authError: document.getElementById('auth-error'),
  
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
    els.navLogoutBtn.classList.remove('hidden');
    els.navDashboardBtn.classList.remove('hidden');
    els.heroActions.style.display = 'block';
    els.heroAuthPrompt.style.display = 'none';
  } else {
    els.navLoginBtn.classList.remove('hidden');
    els.navLogoutBtn.classList.add('hidden');
    els.navDashboardBtn.classList.add('hidden');
    els.heroActions.style.display = 'none';
    els.heroAuthPrompt.style.display = 'block';
  }
}

// Google Auth Callback
window.handleGoogleLogin = async function(response) {
  try {
    const res = await fetch(`${API_BASE}/users/google-login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: response.credential })
    });
    const data = await res.json();
    
    if (res.ok) {
      state.token = data.access;
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      els.authError.innerText = '';
      navigate('dashboard');
    } else {
      els.authError.innerText = data.error || 'Google login failed.';
    }
  } catch (err) {
    els.authError.innerText = 'Network error. Try again later.';
  }
};

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
els.navLoginBtn.addEventListener('click', () => navigate('auth'));
els.navLogoutBtn.addEventListener('click', () => logout());
els.navDashboardBtn.addEventListener('click', () => navigate('dashboard'));
document.querySelector('.logo').addEventListener('click', () => navigate(state.token ? 'dashboard' : 'landing'));

els.dashboard.refreshBtn.addEventListener('click', fetchEmails);

// Chat Logic
const chatInput = document.getElementById('chat-input');
const chatBtn = document.getElementById('send-chat-btn');
const chatHistory = document.getElementById('chat-history');

function appendMessage(text, isUser) {
  const msgDiv = document.createElement('div');
  msgDiv.style.padding = '1rem';
  msgDiv.style.borderRadius = '8px';
  msgDiv.style.maxWidth = '80%';
  
  if (isUser) {
    msgDiv.style.background = 'var(--primary-color)';
    msgDiv.style.color = 'white';
    msgDiv.style.alignSelf = 'flex-end';
    msgDiv.innerText = text;
  } else {
    msgDiv.style.background = 'var(--bg-dark)';
    msgDiv.style.color = 'var(--text-primary)';
    msgDiv.style.alignSelf = 'flex-start';
    msgDiv.innerText = text;
  }
  
  chatHistory.appendChild(msgDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function sendChatMessage() {
  const query = chatInput.value.trim();
  if (!query) return;
  
  appendMessage(query, true);
  chatInput.value = '';
  
  // Add loading placeholder
  const loadingId = 'loading-' + Date.now();
  const loadingDiv = document.createElement('div');
  loadingDiv.id = loadingId;
  loadingDiv.style.padding = '1rem';
  loadingDiv.style.borderRadius = '8px';
  loadingDiv.style.maxWidth = '80%';
  loadingDiv.style.background = 'var(--bg-dark)';
  loadingDiv.style.color = 'var(--text-muted)';
  loadingDiv.style.alignSelf = 'flex-start';
  loadingDiv.innerText = 'Thinking...';
  chatHistory.appendChild(loadingDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  
  try {
    const res = await fetch(`${API_BASE}/emails/chat/`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });
    
    document.getElementById(loadingId).remove();
    
    if (res.status === 401) {
      logout();
      return;
    }
    
    const data = await res.json();
    appendMessage(data.answer || 'No response received.', false);
  } catch (err) {
    document.getElementById(loadingId).remove();
    appendMessage('Error: Could not reach the AI server.', false);
  }
}

chatBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendChatMessage();
});

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
