const API_BASE = 'http://127.0.0.1:8000/api';

// Alarm to check emails every 5 minutes
chrome.alarms.create("checkEmails", { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkEmails") {
    checkNewEmails();
  }
});

// Listener for messages from popup or other parts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkEmailsNow") {
    checkNewEmails().then(() => sendResponse({ status: "done" }));
    return true;
  }
});

async function checkNewEmails() {
  try {
    // 1. Get backend JWT token from storage
    const storage = await chrome.storage.local.get(['access_token']);
    if (!storage.access_token) {
      console.log("No backend token found. User must log in via extension popup.");
      return;
    }

    // 2. Get Gmail OAuth Token
    const token = await getGmailToken();
    if (!token) return;

    // 3. Fetch unread emails from Gmail
    const messages = await fetchUnreadEmails(token);
    if (messages.length === 0) return;

    // 4. Fetch full content of those emails
    const emailDetails = await Promise.all(messages.map(m => fetchEmailDetails(m.id, token)));
    
    // 5. Send to Backend
    await sendToBackend(emailDetails, storage.access_token);

  } catch (error) {
    console.error("Error checking emails:", error);
  }
}

function getGmailToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: false }, function(token) {
      if (chrome.runtime.lastError) {
        console.log("Could not get Gmail token silently.");
        resolve(null);
      } else {
        resolve(token);
      }
    });
  });
}

async function fetchUnreadEmails(token) {
  // Fetch only unread emails in Inbox from the last 1 day or a specific query
  const query = encodeURIComponent('is:unread in:inbox');
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=10`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch messages");
  const data = await res.json();
  return data.messages || [];
}

async function fetchEmailDetails(messageId, token) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  
  let subject = "No Subject";
  let sender = "Unknown Sender";
  
  if (data.payload && data.payload.headers) {
    data.payload.headers.forEach(header => {
      if (header.name.toLowerCase() === 'subject') subject = header.value;
      if (header.name.toLowerCase() === 'from') sender = header.value;
    });
  }

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet,
    subject: subject,
    sender: sender,
    internalDate: data.internalDate
  };
}

async function sendToBackend(emails, backendToken) {
  try {
    const res = await fetch(`${API_BASE}/emails/process/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${backendToken}`
      },
      body: JSON.stringify({ emails })
    });
    
    const data = await res.json();
    
    // If backend found important emails, show notification
    if (res.ok && data.emails) {
      const importantEmails = data.emails.filter(e => e.is_important);
      if (importantEmails.length > 0) {
        importantEmails.forEach(email => {
          showNotification(email.subject, email.sender);
        });
      }
    }
  } catch (error) {
    console.error("Error sending to backend:", error);
  }
}

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon128.png', // Ensure icon exists or ignore
    title: 'Important Job Email!',
    message: `${title}\nFrom: ${message}`,
    priority: 2
  });
}
