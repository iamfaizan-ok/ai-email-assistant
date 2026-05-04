const API_BASE = 'http://127.0.0.1:8000/api';

document.addEventListener('DOMContentLoaded', async () => {
  const loginView = document.getElementById('login-view');
  const loggedInView = document.getElementById('logged-in-view');
  const statusEl = document.getElementById('status');

  // Check initial state
  const storage = await chrome.storage.local.get(['access_token']);
  if (storage.access_token) {
    loginView.classList.add('hidden');
    loggedInView.classList.remove('hidden');
  }

  // Login
  document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    statusEl.innerText = 'Logging in...';
    
    try {
      const res = await fetch(`${API_BASE}/users/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        await chrome.storage.local.set({ access_token: data.access });
        statusEl.innerText = '';
        loginView.classList.add('hidden');
        loggedInView.classList.remove('hidden');
      } else {
        statusEl.innerText = data.detail || 'Login failed';
      }
    } catch (err) {
      statusEl.innerText = 'Network error. Ensure backend is running.';
    }
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await chrome.storage.local.remove('access_token');
    loginView.classList.remove('hidden');
    loggedInView.classList.add('hidden');
    statusEl.innerText = '';
  });

  // Authorize Gmail
  document.getElementById('auth-gmail-btn').addEventListener('click', () => {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError) {
        statusEl.innerText = chrome.runtime.lastError.message;
      } else {
        statusEl.innerText = 'Gmail Authorized!';
        statusEl.style.color = '#10b981';
      }
    });
  });

  // Check Emails Now
  document.getElementById('check-now-btn').addEventListener('click', () => {
    statusEl.innerText = 'Checking emails...';
    statusEl.style.color = 'white';
    chrome.runtime.sendMessage({ action: "checkEmailsNow" }, (response) => {
      if (response && response.status === "done") {
        statusEl.innerText = 'Check complete!';
        statusEl.style.color = '#10b981';
        setTimeout(() => { statusEl.innerText = ''; }, 3000);
      }
    });
  });
});
