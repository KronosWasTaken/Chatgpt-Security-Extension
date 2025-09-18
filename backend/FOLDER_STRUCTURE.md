# Backend Folder Structure - AI Compliance Platform

## 🎯 **MVP Focus: AI Model Usage & Policy Violation Tracking**

This backend tracks **what clients are using AI models** and monitors **policy violations** in real-time.

## 📁 **Core Directory Structure**

```
backend/
├── app/
│   ├── main.py                    # FastAPI application entry point
│   ├── __init__.py
│   │
│   ├── api/                       # API layer
│   │   ├── v1/
│   │   │   ├── router.py          # Main API router
│   │   │   └── endpoints/         # API endpoints
│   │   │       ├── auth.py        # Authentication (login/logout/refresh)
│   │   │       ├── analyze.py     # ⭐ CORE: Prompt analysis & PHI/PII detection
│   │   │       ├── audit.py       # ⭐ CORE: Audit logs for compliance
│   │   │       ├── clients.py     # Client management
│   │   │       ├── users.py       # User management
│   │   │       ├── msp.py         # MSP management & reporting
│   │   │       ├── policies.py    # Policy management
│   │   │       ├── ai_services.py # AI service registry
│   │   │       └── reports.py     # Compliance reporting
│   │   └── __init__.py
│   │
│   ├── core/                      # Core infrastructure
│   │   ├── auth.py                # JWT authentication & authorization
│   │   ├── config.py              # Environment configuration
│   │   ├── database.py            # Database connection & tenant context
│   │   ├── exceptions.py          # Custom exceptions
│   │   ├── logging.py             # Logging configuration
│   │   ├── middleware.py          # Custom middleware (auth, CORS, etc.)
│   │   └── monitoring.py          # Metrics & health checks
│   │
│   ├── models/                    # Database models (SQLAlchemy)
│   │   ├── base.py                # Base model with common fields
│   │   ├── shared.py              # ⭐ Shared: AI services, compliance frameworks
│   │   ├── client.py              # ⭐ Client: Users, policies, audit logs
│   │   ├── msp.py                 # MSP: Management & aggregation
│   │   └── __init__.py
│   │
│   └── services/                  # Business logic layer
│       ├── prompt_analyzer.py     # ⭐ CORE: PHI/PII detection engine
│       ├── audit_logger.py        # ⭐ CORE: Audit trail logging
│       ├── ai_service_registry.py # AI service management
│       ├── policy_engine.py       # Policy enforcement
│       └── compliance_reporter.py # Compliance reporting
│
├── alembic/                       # Database migrations
│   ├── versions/                  # Migration files
│   ├── env.py                     # Alembic configuration
│   └── script.py.mako            # Migration template
│
├── scripts/                       # Utility scripts
│   └── seed_data.py              # Database seeding
│
├── .env                          # Environment variables (from env.example)
├── .gitignore                    # Git ignore rules
├── .pyrightconfig.json           # Python type checking configuration
├── alembic.ini                   # Alembic database migration config
├── pyproject.toml                # Python project dependencies
├── README.md                     # Project documentation
├── setup.ps1                     # Windows setup script
└── uv.lock                       # Dependency lock file
```

## 🎯 **MVP Core Features**

### **1. Real-Time AI Usage Tracking**
- **`/api/v1/analyze/prompt`** - Analyzes prompts for PHI/PII violations
- **`/api/v1/analyze/ai-services`** - Gets approved AI services for clients
- **Database**: `client_audit_logs` table tracks every AI interaction

### **2. Policy Violation Detection**
- **Pattern Detection**: Regex, keywords, ML models for PHI/PII
- **Enforcement Actions**: Allow, warn, block, flag
- **Multi-Framework**: HIPAA, SOC2, GDPR support
- **Database**: `client_policy_violations` table

### **3. Multi-Tenant Compliance**
- **MSP Management**: Multiple MSPs manage multiple clients
- **Row-Level Security**: PostgreSQL RLS for data isolation
- **Tenant Context**: Automatic data filtering per client/MSP

### **4. Audit & Reporting**
- **SOC2 Ready**: Complete audit trails
- **Real-time Dashboards**: Via `/api/v1/msp/summary`
- **Compliance Scoring**: Risk scores and violation tracking

## 🔗 **Key Relationships**

```
MSP 1:N Clients 1:N Users 1:N AuditLogs
       ↓            ↓         ↓
   Policies → Violations ← PatternDetections
       ↓            ↓         ↓
   AIServices → Approvals ← ComplianceFrameworks
```

## 🚀 **Quick Start**

```bash
# Setup environment
.\setup.ps1 setup-env

# Install dependencies
.\setup.ps1 install

# Setup database
.\setup.ps1 setup-db

# Run migrations
.\setup.ps1 migrate

# Start development server
.\setup.ps1 dev
```

## 🔐 **Authentication Flow**

1. **Development Mode**: `DEBUG=true` bypasses JWT for testing
2. **Production Mode**: Full JWT authentication with role-based access
3. **Multi-Tenant**: Automatic tenant context from JWT claims
4. **Permissions**: Fine-grained permission system (`user:read`, `policy:write`, etc.)

This structure perfectly supports the MVP goal of tracking AI model usage and policy violations across multiple clients and MSPs.