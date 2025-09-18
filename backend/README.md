# AI Compliance Platform Backend

FastAPI-based backend for the AI Compliance Platform with multi-tenant architecture, prompt analysis, and compliance monitoring.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- uv package manager

### Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Copy environment configuration**:
   ```bash
   copy env.example .env
   ```

3. **Install dependencies**:
   ```bash
   uv sync
   ```

4. **Setup database**:
   ```bash
   # Create database (if not exists)
   psql -U postgres -c "CREATE DATABASE ai_compliance;"
   ```

5. **Run migrations**:
   ```bash
   uv run alembic upgrade head
   ```

6. **Start development server**:
   ```bash
   uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Using PowerShell Script (Windows)

```powershell
# Full setup and start
.\setup.ps1 start

# Individual commands
.\setup.ps1 setup-env    # Create .env file
.\setup.ps1 install      # Install dependencies
.\setup.ps1 setup-db     # Create database
.\setup.ps1 migrate      # Run migrations
.\setup.ps1 dev          # Start server
```

## 🌐 Access Points

- **Health Check**: http://localhost:8000/health
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Metrics**: http://localhost:8000/metrics

## 🏗️ Architecture

### Core Features
- **Multi-tenant Architecture** with PostgreSQL Row-Level Security (RLS)
- **JWT Authentication** with role-based access control
- **PHI/PII Detection** using regex patterns and ML models
- **Audit Logging** for SOC2 compliance
- **Real-time Prompt Analysis** with policy enforcement
- **Prometheus Metrics** for monitoring

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

⚠️ **Security Warning**: Never use the example keys in production!

**Generate secure keys**:
```bash
# Generate JWT secret key (32 characters)
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"

# Generate application secret key (32 characters)
python -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"

# Generate encryption key (exactly 32 characters)
python -c "import secrets; print('ENCRYPTION_KEY=' + secrets.token_hex(16))"
```

### Development Commands

```bash
# Run tests
uv run pytest

# Format code
uv run black .
uv run isort .

# Lint code
uv run ruff check .
uv run mypy .

# Database operations
uv run alembic revision --autogenerate -m "description"  # Create migration
uv run alembic upgrade head                               # Apply migrations
uv run alembic downgrade -1                             # Rollback

# Health check
curl http://localhost:8000/health
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

## 📈 Monitoring

### Prometheus Metrics
- HTTP request metrics
- Prompt analysis counters
- Policy violation tracking
- Database query performance
- Authentication attempts

### Health Checks
- Database connectivity
- Application status
- API endpoint availability

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues**:
```bash
# Check PostgreSQL status
pg_isready

# Test connection
psql -U postgres -d ai_compliance -c "SELECT 1;"
```

**Migration Issues**:
```bash
# Reset database (WARNING: Deletes all data)
.\setup.ps1 reset-db

# Manual reset
psql -U postgres -c "DROP DATABASE IF EXISTS ai_compliance;"
psql -U postgres -c "CREATE DATABASE ai_compliance;"
uv run alembic upgrade head
```

**Permission Issues**:
- Ensure PostgreSQL user has proper permissions
- Check `.env` file credentials
- Verify database exists

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
├── scripts/               # Utility scripts
├── .env                   # Environment configuration
├── pyproject.toml         # Dependencies and configuration
└── setup.ps1             # Windows setup script
```

## 🤝 Contributing

1. Ensure all tests pass: `uv run pytest`
2. Format code: `uv run black . && uv run isort .`
3. Check linting: `uv run ruff check .`
4. Update documentation as needed

---

**Built with FastAPI, PostgreSQL, and modern Python practices.**