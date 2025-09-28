import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.services.metrics_calculator import MetricsCalculator
from app.models import Client
from sqlalchemy import select

async def demo_metrics_calculation():
    """Demonstrate how metrics are calculated from real data"""
    
    async for session in get_async_session():
        try:
            # Get the first client
            client_query = select(Client).limit(1)
            client_result = await session.execute(client_query)
            client = client_result.scalar_one_or_none()
            
            if not client:
                print("❌ No clients found. Run seed script first.")
                return
            
            print(f"📊 Calculating metrics for client: {client.name}")
            print("=" * 50)
            
            # Initialize metrics calculator
            calculator = MetricsCalculator(session)
            
            # Calculate all metrics
            metrics = await calculator.calculate_client_metrics(str(client.id))
            
            print("🔢 CALCULATED METRICS:")
            print(f"   Apps Monitored: {metrics['apps_monitored']}")
            print(f"   Interactions Monitored: {metrics['interactions_monitored']}")
            print(f"   Agents Deployed: {metrics['agents_deployed']}")
            print(f"   Risk Score: {metrics['risk_score']:.1f}")
            print(f"   Compliance Coverage: {metrics['compliance_coverage']:.1f}%")
            
            print("\n📈 HOW METRICS ARE CALCULATED:")
            print("=" * 50)
            
            # Show detailed calculations
            await show_detailed_calculations(session, calculator, str(client.id))
            
        except Exception as e:
            print(f"❌ Error: {e}")
            raise
        finally:
            await session.close()

async def show_detailed_calculations(session: AsyncSession, calculator: MetricsCalculator, client_id: str):
    """Show detailed breakdown of how each metric is calculated"""
    
    print("\n1️⃣ APPS MONITORED:")
    print("   = Count of unique AI services for the client")
    print("   = SELECT COUNT(DISTINCT id) FROM client_ai_services WHERE client_id = ?")
    
    print("\n2️⃣ INTERACTIONS MONITORED:")
    print("   = Sum of daily interactions from department + application engagement")
    print("   = SUM(department_engagement.interactions) + SUM(application_engagement.interactions_per_day)")
    
    print("\n3️⃣ AGENTS DEPLOYED:")
    print("   = Count of active agents (deployed > 0)")
    print("   = SELECT COUNT(*) FROM agent_engagement WHERE client_id = ? AND deployed > 0")
    
    print("\n4️⃣ RISK SCORE:")
    print("   = Calculated based on alerts and unsanctioned usage:")
    print("   - High severity alerts: +25 points each")
    print("   - Medium severity alerts: +15 points each") 
    print("   - Unsanctioned AI services: +20 points each")
    print("   - Capped at 100 points maximum")
    
    print("\n5️⃣ COMPLIANCE COVERAGE:")
    print("   = Percentage of permitted vs total AI services")
    print("   = (Permitted Services / Total Services) * 100")
    
    print("\n🔄 REAL-TIME vs STORED METRICS:")
    print("=" * 50)
    print("✅ Real-time calculation (current approach):")
    print("   - Metrics calculated on every API call")
    print("   - Always up-to-date")
    print("   - Higher database load")
    
    print("\n⚡ Background calculation (recommended for production):")
    print("   - Metrics calculated periodically (e.g., every hour)")
    print("   - Stored in client_metrics table")
    print("   - Faster API responses")
    print("   - Lower database load")
    
    print("\n🚀 TO USE BACKGROUND CALCULATION:")
    print("   1. Run: uv run python scripts/update_metrics.py")
    print("   2. Set up cron job for automatic updates")
    print("   3. Modify API to read from client_metrics table")

if __name__ == "__main__":
    asyncio.run(demo_metrics_calculation())
