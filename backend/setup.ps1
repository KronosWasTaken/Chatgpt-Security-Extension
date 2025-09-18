# AI Compliance Platform Backend Setup Script for Windows

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

function Show-Help {
    Write-Host "AI Compliance Platform Backend - Windows Setup" -ForegroundColor Green
    Write-Host "Available commands:" -ForegroundColor Yellow
    Write-Host "  .\setup.ps1 install     - Install dependencies" -ForegroundColor Cyan
    Write-Host "  .\setup.ps1 setup-env   - Setup environment file" -ForegroundColor Cyan
    Write-Host "  .\setup.ps1 setup-db    - Setup database" -ForegroundColor Cyan
    Write-Host "  .\setup.ps1 migrate     - Run database migrations" -ForegroundColor Cyan
    Write-Host "  .\setup.ps1 dev         - Start development server" -ForegroundColor Cyan
    Write-Host "  .\setup.ps1 start       - Full setup and start" -ForegroundColor Cyan
    Write-Host "  .\setup.ps1 test        - Run tests" -ForegroundColor Cyan
    Write-Host "  .\setup.ps1 health      - Check application health" -ForegroundColor Cyan
    Write-Host "  .\setup.ps1 reset-db    - Reset database (WARNING: Deletes all data)" -ForegroundColor Red
}

function Install-Dependencies {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    uv sync
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

function Setup-Environment {
    Write-Host "⚙️  Setting up environment file..." -ForegroundColor Yellow
    if (Test-Path ".env") {
        Write-Host "⚠️  .env file already exists" -ForegroundColor Yellow
    } else {
        Copy-Item "env.example" ".env"
        Write-Host "✅ Environment file created from example" -ForegroundColor Green
        Write-Host "💡 You may need to edit .env with your PostgreSQL credentials" -ForegroundColor Cyan
    }
}

function Setup-Database {
    Write-Host "🗄️  Setting up database..." -ForegroundColor Yellow
    
    # Check if PostgreSQL is running
    $pgReady = pg_isready 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ PostgreSQL is not running. Please start PostgreSQL first." -ForegroundColor Red
        exit 1
    }
    
    # Create database
    Write-Host "📝 Creating database..." -ForegroundColor Yellow
    psql -U postgres -c "CREATE DATABASE ai_compliance;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database created successfully" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Database already exists" -ForegroundColor Cyan
    }
}

function Run-Migrations {
    Write-Host "🔧 Running database migrations..." -ForegroundColor Yellow
    uv run alembic upgrade head
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migrations completed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration failed" -ForegroundColor Red
        exit 1
    }
}

function Start-Development {
    Write-Host "🚀 Starting development server..." -ForegroundColor Yellow
    Write-Host "💡 API Documentation: http://localhost:8000/docs" -ForegroundColor Cyan
    Write-Host "💡 Health Check: http://localhost:8000/health" -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
}

function Start-Full {
    Write-Host "🎯 Starting full setup..." -ForegroundColor Green
    Setup-Environment
    Install-Dependencies
    Setup-Database
    Run-Migrations
    Start-Development
}

function Run-Tests {
    Write-Host "🧪 Running tests..." -ForegroundColor Yellow
    uv run pytest
}

function Check-Health {
    Write-Host "🔍 Checking application health..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
        Write-Host "✅ Application is healthy: $($response.Content)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Application is not running or unhealthy" -ForegroundColor Red
    }
}

function Reset-Database {
    Write-Host "⚠️  WARNING: This will delete all data in the ai_compliance database" -ForegroundColor Red
    $confirm = Read-Host "Are you sure? Type 'yes' to continue"
    if ($confirm -eq "yes") {
        Write-Host "🗑️  Resetting database..." -ForegroundColor Yellow
        psql -U postgres -c "DROP DATABASE IF EXISTS ai_compliance;"
        psql -U postgres -c "CREATE DATABASE ai_compliance;"
        Run-Migrations
        Write-Host "✅ Database reset complete" -ForegroundColor Green
    } else {
        Write-Host "❌ Database reset cancelled" -ForegroundColor Yellow
    }
}

# Main command dispatcher
switch ($Command.ToLower()) {
    "help" { Show-Help }
    "install" { Install-Dependencies }
    "setup-env" { Setup-Environment }
    "setup-db" { Setup-Database }
    "migrate" { Run-Migrations }
    "dev" { Start-Development }
    "start" { Start-Full }
    "test" { Run-Tests }
    "health" { Check-Health }
    "reset-db" { Reset-Database }
    default { 
        Write-Host "❌ Unknown command: $Command" -ForegroundColor Red
        Show-Help 
    }
}