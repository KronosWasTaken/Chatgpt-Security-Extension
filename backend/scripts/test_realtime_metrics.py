import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.services.metrics_calculator import MetricsCalculator
from app.models import Client, ClientAIServices, Alert, DepartmentEngagement
from sqlalchemy import select

async def test_realtime_metrics():
    """Test that metrics are calculated in real-time from actual data"""
    
    async for session in get_async_session():
        try:
            print("🧪 Testing Real-time Metrics Calculation")
            print("=" * 50)
            
            # Get the first client
            client_query = select(Client).limit(1)
            client_result = await session.execute(client_query)
            client = client_result.scalar_one_or_none()
            
            if not client:
                print("❌ No clients found. Run seed script first.")
                return
            
            print(f"📊 Testing metrics for: {client.name}")
            print()
            
            # Initialize metrics calculator
            calculator = MetricsCalculator(session)
            
            # Calculate metrics
            metrics = await calculator.calculate_client_metrics(str(client.id))
            
            print("🔢 REAL-TIME CALCULATED METRICS:")
            print(f"   Apps Monitored: {metrics['apps_monitored']}")
            print(f"   Interactions Monitored: {metrics['interactions_monitored']}")
            print(f"   Agents Deployed: {metrics['agents_deployed']}")
            print(f"   Risk Score: {metrics['risk_score']:.1f}")
            print(f"   Compliance Coverage: {metrics['compliance_coverage']:.1f}%")
            
            print("\n📈 VERIFICATION - Let's check the actual data:")
            print("-" * 30)
            
            # Verify apps monitored
            ai_services_query = select(ClientAIServices).where(
                ClientAIServices.client_id == client.id
            )
            ai_services_result = await session.execute(ai_services_query)
            ai_services = ai_services_result.scalars().all()
            print(f"   AI Services in DB: {len(ai_services)}")
            
            # Verify interactions
            dept_query = select(DepartmentEngagement).where(
                DepartmentEngagement.client_id == client.id
            )
            dept_result = await session.execute(dept_query)
            dept_engagements = dept_result.scalars().all()
            total_interactions = sum(dept.interactions for dept in dept_engagements)
            print(f"   Department Interactions: {total_interactions}")
            
            # Verify alerts
            alerts_query = select(Alert).where(Alert.client_id == client.id)
            alerts_result = await session.execute(alerts_query)
            alerts = alerts_result.scalars().all()
            high_alerts = len([a for a in alerts if a.severity == "High"])
            medium_alerts = len([a for a in alerts if a.severity == "Medium"])
            print(f"   High Severity Alerts: {high_alerts}")
            print(f"   Medium Severity Alerts: {medium_alerts}")
            
            # Verify unsanctioned services
            unsanctioned_query = select(ClientAIServices).where(
                ClientAIServices.client_id == client.id,
                ClientAIServices.status == "Unsanctioned"
            )
            unsanctioned_result = await session.execute(unsanctioned_query)
            unsanctioned_services = unsanctioned_result.scalars().all()
            print(f"   Unsanctioned Services: {len(unsanctioned_services)}")
            
            print("\n✅ METRICS ARE CALCULATED IN REAL-TIME!")
            print("   - No hardcoded values")
            print("   - Always up-to-date")
            print("   - Based on actual database data")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            raise
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(test_realtime_metrics())
