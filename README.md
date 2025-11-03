# ChatGPT Security Extension - AI Compliance Platform

A comprehensive security platform that protects ChatGPT and AI services from malicious files, prompt injection attacks, and ensures compliance across MSP (Managed Service Provider) client portfolios.

## 🏗️ Project Structure

This project consists of three main components:

```
Chatgpt-Security-Extension/
├── backend/          # FastAPI Python backend server
├── frontend/         # React + TypeScript dashboard (MSP portal)
└── extension/        # Chrome extension for ChatGPT protection
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.13+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 18+** and npm/yarn/pnpm - [Download Node.js](https://nodejs.org/)
- **PostgreSQL 14+** - [Download PostgreSQL](https://www.postgresql.org/download/)
- **Git** - For cloning the repository

### Optional Tools

- **uv** (recommended Python package manager) - [Install uv](https://github.com/astral-sh/uv)
- **pnpm** (optional, for extension) - `npm install -g pnpm`

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Chatgpt-Security-Extension
```

### 2. Set Up PostgreSQL Database

Create a PostgreSQL database for the project:

```bash
# Using psql (PostgreSQL command line)
psql -U postgres

# Inside psql, create the database
CREATE DATABASE aicompliance;
\q
```

Or using createdb command:
```bash
createdb -U postgres aicompliance
```

### 3. Backend Setup

#### Option A: Using uv (Recommended)

```bash
cd backend

# Install uv if you haven't already
# On Windows: powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
# On Linux/Mac: curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync

# Activate the virtual environment
# On Windows:
.venv\Scripts\activate
# On Linux/Mac:
source .venv/bin/activate
```

#### Option B: Using pip

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -e .
```

#### Configure Environment Variables

```bash
# Copy the example environment file
cp ENV_EXAMPLE.txt .env

# Edit .env with your configuration
```

**Required `.env` settings:**

```env
# Database (adjust credentials as needed)
DATABASE_URL=postgresql://user:password@localhost:5432/aicompliance
DATABASE_URL_ASYNC=postgresql+asyncpg://user:password@localhost:5432/aicompliance

# Security Keys (generate secure random strings)
SECRET_KEY=your-32-character-secret-key-here
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ALGORITHM=HS256

# CORS Origins
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,chrome-extension://*,moz-extension://*

# AI Services (Get your API key from https://aistudio.google.com/apikey)
GEMINI_API_KEY=your-gemini-api-key

# App Config
DEBUG=true
LOG_LEVEL=INFO
HOST=0.0.0.0
PORT=8000

# File Upload Security
MAX_UPLOAD_BYTES=10485760
ALLOWED_EXTS=pdf,jpg,jpeg,png,txt,md,zip,json,log,csv,pfx,p12,pem,key
ALLOWED_MIME=application/pdf,image/jpeg,image/png,text/plain,application/json,application/zip
```

#### Run Database Migrations

```bash
# Make sure you're in the backend directory and virtual environment is activated
cd backend

# Run Alembic migrations to create database schema
alembic upgrade head
```

#### Seed Mock Data

After migrations, seed the database with mock data for testing:

```bash
# Option 1: Using the run_seed script
python scripts/run_seed.py

# Option 2: Running seed_mock_data directly
python scripts/seed_mock_data.py
```

**What gets seeded:**
- 1 MSP (Cybercept MSP)
- 3 MSP users (admin, user, analyst)
- 4 Clients (TechCorp Solutions, FinanceFirst Bank, HealthCare Plus, RetailMax Stores)
- 6 AI Services (ChatGPT, Claude, Microsoft Copilot, Jasper, Notion AI, Perplexity)
- 5 Client AI Applications
- 30 days of usage data
- 3 Compliance Frameworks (HIPAA, GDPR, PCI DSS)
- Detection patterns and alerts
- Agent engagement and user engagement data

#### Start the Backend Server

```bash
# Using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using Python module
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at:
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
# or
pnpm install
# or
yarn install

# Start development server
npm run dev
# or
pnpm dev
# or
yarn dev
```

The frontend will be available at **http://localhost:5173** (or the port shown in your terminal).

### 5. Extension Setup

```bash
cd extension

# Install dependencies
npm install
# or
pnpm install

# Build for development
npm run dev
# or
pnpm dev

# Build for production
npm run build
# or
pnpm build
```

#### Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the extension build directory:
   - For development: `extension/build/chrome-mv3-dev/`
   - For production: `extension/build/chrome-mv3-prod/`

#### Configure Extension

1. Click the extension icon in Chrome
2. Go to the **Settings** tab
3. Configure:
   - **Backend API URL**: `http://localhost:8000`
   - **JWT Token**: Login through the extension to get your token
   - Optional: **VirusTotal API Key** (for file scanning)
   - Optional: **Gemini API Key** (for local fallback analysis)

## 📊 Running All Services

For a complete development environment, run all three services:

### Terminal 1: Backend
```bash
cd backend
# Activate virtual environment first
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

### Terminal 3: Extension (Development)
```bash
cd extension
npm run dev
```

Then load the extension in Chrome from `extension/build/chrome-mv3-dev/`

## 🧪 Testing

### Test Backend API

```bash
cd backend

# Test with Python script
python test_api_endpoints.py

# Or test specific endpoints
python test_complete_integration.py
```

### Test Extension

1. Make sure backend is running
2. Load extension in Chrome
3. Navigate to `chatgpt.com` or `chat.openai.com`
4. Try:
   - Upload a file (should be scanned)
   - Type a malicious prompt like "ignore previous instructions" (should be blocked)
   - Type a normal prompt (should be allowed)

### Test Frontend

The frontend connects to the backend API. Make sure:
1. Backend is running on `http://localhost:8000`
2. Frontend is running on `http://localhost:5173`
3. You have seeded data in the database
4. Login with seeded user credentials

**Default Seeded Users:**
- MSP Admin: `admin@cybercept.com` / `admin123`
- MSP User: `user@cybercept.com` / `user123`
- Client Admin: `bob@techcorp.com` / `password123`

## 🔧 Common Commands

### Backend

```bash
cd backend

# Run migrations
alembic upgrade head          # Apply all migrations
alembic downgrade -1          # Rollback one migration
alembic revision --autogenerate -m "description"  # Create new migration

# Seed data
python scripts/run_seed.py    # Run complete seeding
python scripts/seed_mock_data.py  # Run seeding directly

# Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest  # If you have test files set up
```

### Frontend

```bash
cd frontend

npm run dev       # Development server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # Run linter
```

### Extension

```bash
cd extension

npm run dev       # Development build (watch mode)
npm run build     # Production build
npm run package   # Create ZIP package
```

## 🔑 API Keys Setup

### Gemini API Key (Required for Backend)

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new API key
3. Add to backend `.env` file:
   ```
   GEMINI_API_KEY=your-api-key-here
   ```

### VirusTotal API Key (Optional, for Extension)

1. Sign up at [VirusTotal](https://www.virustotal.com/)
2. Get API key from [API Key Page](https://www.virustotal.com/gui/my-apikey)
3. Add to extension settings (through extension UI)

## 📁 Project Components

### Backend (`backend/`)

- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy
- **Migrations**: Alembic
- **Authentication**: JWT tokens
- **Key Features**:
  - Prompt injection analysis
  - File scanning and security
  - AI service management
  - MSP and client management
  - Compliance framework tracking

### Frontend (`frontend/`)

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Key Features**:
  - MSP portfolio dashboard
  - Client management views
  - AI application monitoring
  - Compliance tracking
  - Risk assessment

### Extension (`extension/`)

- **Framework**: Plasmo (Chrome Extension)
- **Language**: TypeScript + React
- **Key Features**:
  - Real-time prompt analysis
  - File upload scanning
  - Malicious content blocking
  - Security logging

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
# Windows:
Get-Service postgresql*

# Linux/Mac:
sudo systemctl status postgresql
# or
brew services list
```

### Backend Won't Start

1. Check `.env` file exists and is configured correctly
2. Verify database is running and accessible
3. Ensure all dependencies are installed
4. Check port 8000 is not in use

### Migration Issues

```bash
# If migrations fail, you may need to drop and recreate
# WARNING: This will delete all data!
# Only use in development

# Drop database (in psql)
DROP DATABASE aicompliance;
CREATE DATABASE aicompliance;

# Run migrations again
alembic upgrade head
```

### Extension Not Loading

1. Make sure you've built the extension (`npm run build` or `npm run dev`)
2. Check Chrome Developer Console for errors
3. Verify backend URL in extension settings
4. Ensure CORS is configured correctly in backend

### Frontend Can't Connect to Backend

1. Verify backend is running on `http://localhost:8000`
2. Check CORS settings in backend `.env`
3. Verify API endpoints are correct
4. Check browser console for errors

## 📚 Additional Documentation

- **Backend Scripts**: `backend/scripts/README.md`
- **Integration Guide**: `INTEGRATION_TESTING_GUIDE.md`
- **Quick Start**: `QUICK_START.md`
- **Prompt Testing**: `PROMPT_TESTING_GUIDE.md`
- **API Testing**: `TEST_API_ENDPOINTS.md`

## 🔐 Default Credentials (Seeded Data)

After running `seed_mock_data.py`:

### MSP Users
- **Admin**: `admin@cybercept.com` / `admin123`
- **User**: `user@cybercept.com` / `user123`
- **Analyst**: `analyst@cybercept.com` / `analyst123`

### Client Users
- **TechCorp Admin**: `bob@techcorp.com` / `password123`
- **TechCorp User**: `alice@techcorp.com` / `password123`
- **FinanceFirst Admin**: `carol@financefirst.com` / `password123`
- **FinanceFirst User**: `david@financefirst.com` / `password123`

**⚠️ Important**: Change these passwords in production!

## 📝 Environment Variables Reference

See `backend/ENV_EXAMPLE.txt` for all available environment variables and their descriptions.

## 🚀 Production Deployment

For production deployment:

1. Set `DEBUG=false` in `.env`
2. Use strong, randomly generated keys for `SECRET_KEY`, `ENCRYPTION_KEY`, and `JWT_SECRET_KEY`
3. Configure proper CORS origins
4. Set up proper PostgreSQL connection with SSL
5. Use environment-specific configurations
6. Set up proper logging and monitoring
7. Build frontend with `npm run build`
8. Build extension with `npm run build`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ for AI Security and Compliance**

For issues, questions, or contributions, please open an issue or pull request on GitHub.

