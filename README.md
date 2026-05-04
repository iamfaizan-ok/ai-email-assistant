# AI Email Assistant

AI Email Assistant is a modern, decoupled full-stack application designed to securely connect to your Gmail account, intelligently analyze incoming emails in the background, and instantly notify you of important job-related opportunities (such as interviews, offers, or application updates).

## 🏗️ Architecture

The project is split into three independent modules:

1. **Backend (Django REST Framework)**: 
   - Provides secure token-based authentication (JWT).
   - Exposes REST APIs for user management and email processing.
   - Houses the AI classification engine to determine if an email is "Job-Related".
   - Connects to PostgreSQL (with a local SQLite fallback for easy development).

2. **Frontend (Vite + Vanilla JS/CSS)**:
   - A lightning-fast Single Page Application (SPA).
   - Features a premium, responsive, glassmorphism dark-mode UI.
   - Provides a dashboard to view your important emails and an interface to download the extension.

3. **Chrome Extension (Manifest V3)**:
   - Integrates with Google OAuth 2.0 to securely access your Gmail inbox (read-only).
   - Runs silently in the background, polling for unread emails.
   - Pushes new emails to the backend API for AI classification.
   - Triggers native desktop notifications when important opportunities are detected.

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Run the Backend
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt # (Ensure dependencies are installed)
python manage.py migrate
python manage.py runserver 8000
```

### 2. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173/` in your browser.

### 3. Install the Extension
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the `/extension` directory from this repository.
4. *Note: Ensure you update the `client_id` in `extension/manifest.json` with your Google Cloud Console Client ID to enable Gmail OAuth.*

## 🔒 Security
- **No Plaintext Passwords**: Uses secure Django hashing.
- **Stateless Sessions**: JWT tokens are used for all API communications.
- **Read-Only Access**: The Chrome Extension only requests the `gmail.readonly` scope.
