# Database Seed Scripts

This directory contains scripts to populate the database with test data.

## Scripts

### 1. `seed_complete_data.py` - Full Production Data
**Purpose**: Seeds the database with comprehensive, realistic data matching the frontend mock data exactly.

**What it creates**:
- 1 MSP (Cybercept MSP)
- 2 MSP users (admin and analyst)
- 3 clients (Acme Health, TechCorp Solutions, Metro Finance)
- 15 AI services
- Client AI services (inventory) for each client
- Client metrics for dashboard
- Department engagement data
- Application engagement data
- Agent engagement data
- Productivity correlations
- 8 sample alerts
- Client policies
- Compliance reports
- Portfolio reports

**Usage**:
```bash
cd backend
uv run python scripts/seed_complete_data.py
```

### 2. `seed_minimal_data.py` - Basic Test Data
**Purpose**: Seeds the database with minimal data for basic testing and development.

**What it creates**:
- 1 MSP (Test MSP)
- 1 user (test@testmsp.com)
- 1 client (Test Client)
- 1 AI service (ChatGPT)
- Basic engagement data
- 1 sample alert
- 1 policy

**Usage**:
```bash
cd backend
uv run python scripts/seed_minimal_data.py
```

## Prerequisites

1. **Database Migration**: Ensure all migrations have been run
   ```bash
   uv run alembic upgrade head
   ```

2. **Environment**: Make sure your database connection is configured in `.env`

3. **Dependencies**: Ensure all required packages are installed
   ```bash
   uv sync
   ```

## Data Details

### Client Data
The complete seed script creates three clients matching the frontend mock data:

1. **Acme Health** (Healthcare, Medium)
   - 6 AI services (3 Applications, 3 Agents)
   - 18 apps monitored, 12,450 interactions
   - 7 agents deployed, 75% risk score, 87% compliance

2. **TechCorp Solutions** (Technology, Large)
   - 4 AI services (3 Applications, 1 Agent)
   - 24 apps monitored, 28,900 interactions
   - 12 agents deployed, 45% risk score, 93% compliance

3. **Metro Finance** (Financial Services, Large)
   - 3 AI services (2 Applications, 1 Agent)
   - 31 apps monitored, 15,670 interactions
   - 9 agents deployed, 85% risk score, 91% compliance

### Engagement Data
- **Departments**: Sales, Marketing, Customer Support, Engineering, Finance, HR
- **Applications**: ChatGPT, Claude, Microsoft Copilot, GitHub Copilot, etc.
- **Agents**: Sales Email Coach, Support Reply Summarizer, etc.
- **Productivity Correlations**: Realistic 7-day interaction patterns

### Alert Data
- **Types**: Unsanctioned Use, Sensitive Data, Agent Risk, Usage Anomaly
- **Severities**: Low, Medium, High, Critical
- **Statuses**: Unassigned, Pending, Complete, AI Resolved
- **Frameworks**: NIST, ISO_42001, EU_AI

## Authentication

The seed scripts create test users with the following credentials:

**MSP Admin**:
- Email: `john.smith@cybercept.com`
- Password: `admin123`

**MSP User**:
- Email: `sarah.johnson@cybercept.com`
- Password: `admin123`

**Test User** (minimal script):
- Email: `test@testmsp.com`
- Password: `admin123`

## API Testing

After seeding, you can test the API endpoints:

```bash
# Get all clients
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/clients/

# Get client inventory
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/clients/{client_id}/inventory

# Get client engagement
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/clients/{client_id}/engagement
```

## Troubleshooting

### Common Issues

1. **Migration Errors**: Make sure to run migrations first
   ```bash
   uv run alembic upgrade head
   ```

2. **Database Connection**: Check your `.env` file for correct database URL

3. **Permission Errors**: Ensure the database user has CREATE/INSERT permissions

4. **Duplicate Data**: The scripts check for existing data and won't create duplicates

### Resetting Data

To reset the database and start fresh:

```bash
# Drop and recreate database (be careful!)
uv run alembic downgrade base
uv run alembic upgrade head
uv run python scripts/seed_complete_data.py
```

## Customization

You can modify the seed scripts to:
- Add more clients
- Change engagement data
- Modify alert types
- Add different AI services
- Update compliance frameworks

The scripts are designed to be easily customizable while maintaining data consistency.
