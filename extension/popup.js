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

  // Connect & Authorize
  document.getElementById('auth-gmail-btn').addEventListener('click', () => {
    statusEl.innerText = 'Authorizing...';
    statusEl.style.color = '#94a3b8';
    
    chrome.identity.getAuthToken({ interactive: true }, async function(token) {
      if (chrome.runtime.lastError) {
        statusEl.innerText = chrome.runtime.lastError.message;
        statusEl.style.color = '#ef4444';
        return;
      }
      
      statusEl.innerText = 'Linking account...';
      try {
        const res = await fetch(`${API_BASE}/users/google-login/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: token })
        });
        const data = await res.json();
        
        if (res.ok) {
          await chrome.storage.local.set({ access_token: data.access });
          statusEl.innerText = '';
          loginView.classList.add('hidden');
          loggedInView.classList.remove('hidden');
        } else {
          statusEl.innerText = data.error || 'Failed to link account';
          statusEl.style.color = '#ef4444';
        }
      } catch (err) {
        statusEl.innerText = 'Network error. Ensure backend is running.';
        statusEl.style.color = '#ef4444';
      }
    });
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await chrome.storage.local.remove('access_token');
    loginView.classList.remove('hidden');
    loggedInView.classList.add('hidden');
    statusEl.innerText = '';
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
