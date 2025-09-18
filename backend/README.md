# AI Compliance Platform Backend

FastAPI-based backend for the AI Compliance Platform with multi-tenant architecture, prompt analysis, and compliance monitoring.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- PowerShell (for Windows setup script)

### Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Run the setup script**:
   ```powershell
   .\setup.ps1 start
   ```

   This will automatically:
   - Create .env file from template
   - Install Python dependencies
   - Set up PostgreSQL database
   - Run database migrations
   - Start the development server

### PowerShell Script Commands

```powershell
# Full setup and start
.\setup.ps1 start

# Individual commands
.\setup.ps1 setup-env    # Create .env file from template
.\setup.ps1 install      # Install Python dependencies using pip
.\setup.ps1 setup-db     # Create PostgreSQL database
.\setup.ps1 migrate      # Run Alembic migrations
.\setup.ps1 dev          # Start development server
.\setup.ps1 reset-db     # Reset database (WARNING: Deletes all data)
```

## 🌐 Access Points

- **Health Check**: http://localhost:8000/health
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## 🏗️ Architecture

### Core Features
- **Multi-tenant Architecture** with PostgreSQL Row-Level Security (RLS)
- **JWT Authentication** with role-based access control
- **PHI/PII Detection** using regex patterns and ML models
- **Audit Logging** for SOC2 compliance
- **Real-time Prompt Analysis** with policy enforcement

### Database Design
- **Shared Schema**: Global reference data (AI services, compliance frameworks)
- **MSP Schema**: MSP company management and client relationships
- **Client Schema**: Client-specific data with RLS isolation

### API Structure
```
/api/v1/
├── auth/           # Authentication & JWT tokens
├── msp/           # MSP management
├── clients/       # Client management
├── users/         # User management
├── policies/      # Policy configuration
├── ai-services/   # AI service registry
├── analyze/       # Prompt analysis (core feature)
├── audit/         # Audit logs
└── reports/       # Compliance reporting
```

## 🔧 Development

### Environment Configuration

The `.env` file contains all necessary configuration. Key settings:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_compliance
DATABASE_URL_ASYNC=postgresql+asyncpg://postgres:password@localhost:5432/ai_compliance

# Authentication
JWT_SECRET_KEY=your-jwt-secret-key
SECRET_KEY=your-app-secret-key
ENCRYPTION_KEY=your-32-character-encryption-key

# Development
DEBUG=true
RELOAD=true
```

**Important Notes**:
- The backend is configured to work with Chrome extensions (note the `chrome-extension://*` in ALLOWED_ORIGINS)
- In development mode (`DEBUG=true`), authentication is disabled for easier testing
- The Chrome extension can connect to this backend via the BackendConfigPanel in the extension options

⚠️ **Security Warning**: Never use the example keys in production!

**Important Notes**:
- The backend is configured to work with Chrome extensions (note the `chrome-extension://*` in ALLOWED_ORIGINS)
- In development mode (`DEBUG=true`), authentication is disabled for easier testing
- The Chrome extension can connect to this backend via the BackendConfigPanel in the extension options

**Generate secure keys**:
```powershell
# Generate JWT secret key (64 characters)
.venv\Scripts\python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"

# Generate application secret key (64 characters)
.venv\Scripts\python -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"

# Generate encryption key (exactly 32 characters)
.venv\Scripts\python -c "import secrets; print('ENCRYPTION_KEY=' + secrets.token_hex(16))"
```

### Development Commands

```powershell
# Database operations (run from virtual environment)
.venv\Scripts\python -m alembic revision --autogenerate -m "description"  # Create migration
.venv\Scripts\python -m alembic upgrade head                               # Apply migrations
.venv\Scripts\python -m alembic downgrade -1                             # Rollback

# Health check
curl http://localhost:8000/health

# Or use PowerShell script
.\setup.ps1 migrate      # Apply migrations
.\setup.ps1 dev          # Start development server
```

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication with access and refresh tokens
- Role-based access control (RBAC)
- Multi-tenant data isolation
- Row-Level Security (RLS) policies

### Data Protection
- AES-256 encryption for sensitive data
- SHA-256 hashing for prompt deduplication
- Input validation and sanitization
- SQL injection protection

### Compliance
- **HIPAA**: Healthcare data protection
- **SOC2**: Security and availability controls
- **GDPR**: Data privacy and protection
- **Financial**: PCI-DSS and banking regulations

## 📊 Core API Usage

### Authentication

```bash
# Login
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'

# Use token
curl -X GET "http://localhost:8000/api/v1/analyze/ai-services" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Prompt Analysis

```bash
# Analyze prompt for PHI/PII
curl -X POST "http://localhost:8000/api/v1/analyze/prompt" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Patient John Doe has SSN 123-45-6789",
    "url": "https://chat.openai.com",
    "session_id": "session-123"
  }'
```

## 🚦 Development Mode

When `DEBUG=true` in your `.env` file:
- Authentication is **disabled** for easier development
- All endpoints are accessible without tokens
- Detailed error messages and stack traces
- Auto-reload on code changes

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues**:
```powershell
# Test connection using PowerShell
.\setup.ps1 setup-db     # Will test and create database if needed

# Manual test (requires psql in PATH)
psql -U postgres -d ai_compliance -c "SELECT 1;"
```

**Migration Issues**:
```powershell
# Reset database (WARNING: Deletes all data)
.\setup.ps1 reset-db

# Or manual reset
.\setup.ps1 setup-db     # Recreates database
.\setup.ps1 migrate      # Apply migrations
```

**Permission Issues**:
- Ensure PostgreSQL user has proper permissions
- Check `.env` file credentials
- Verify database exists

**Health Check**:
```powershell
# Test if the server is running
curl http://localhost:8000/health
# Should return: {"status": "healthy", "version": "0.1.0"}
```

## 📁 Project Structure

```
backend/
├── app/
│   ├── api/v1/endpoints/    # API endpoint definitions
│   ├── core/               # Core functionality (auth, database, etc.)
│   ├── models/             # Database models
│   ├── services/           # Business logic services
│   └── main.py            # FastAPI application
├── alembic/               # Database migrations
├── scripts/               # Utility scripts (seed_data.py)
├── .env                   # Environment configuration (create from .env.example)
├── .env.example           # Environment template
├── pyproject.toml         # Dependencies and configuration
├── setup.ps1             # Windows PowerShell setup script
└── README.md             # This file
```

## 🤝 Contributing

1. Use the PowerShell setup script for consistent environment setup
2. Test your changes with: `.\setup.ps1 dev`
3. Ensure the health check passes: `curl http://localhost:8000/health`
4. Update documentation as needed
5. Follow the existing code structure and patterns

---

**Built with FastAPI, PostgreSQL, and modern Python practices.**