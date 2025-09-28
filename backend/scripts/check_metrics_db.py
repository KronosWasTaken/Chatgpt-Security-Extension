import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.models import Client, ClientMetrics
from sqlalchemy import select, func

async def check_metrics_in_db():
    """Check what metrics are stored in the database"""
    
    async for session in get_async_session():
        try:
            print("📊 Checking Metrics in Database")
            print("=" * 50)
            
            # Get all clients
            clients_query = select(Client)
            clients_result = await session.execute(clients_query)
            clients = clients_result.scalars().all()
            
            print(f"Found {len(clients)} clients in database")
            print()
            
            for client in clients:
                print(f"🏢 Client: {client.name}")
                
                # Get latest metrics for this client
                metrics_query = select(ClientMetrics).where(
                    ClientMetrics.client_id == client.id
                ).order_by(ClientMetrics.date.desc()).limit(1)
                
                metrics_result = await session.execute(metrics_query)
                latest_metrics = metrics_result.scalar_one_or_none()
                
                if latest_metrics:
                    print(f"   📈 Latest Metrics (Date: {latest_metrics.date}):")
                    print(f"      Apps Monitored: {latest_metrics.apps_monitored}")
                    print(f"      Interactions: {latest_metrics.interactions_monitored}")
                    print(f"      Agents Deployed: {latest_metrics.agents_deployed}")
                    print(f"      Risk Score: {latest_metrics.risk_score}")
                    print(f"      Compliance: {latest_metrics.compliance_coverage}%")
                else:
                    print("   ❌ No metrics found for this client")
                
                print()
            
            # Get total metrics count
            total_metrics_query = select(func.count(ClientMetrics.id))
            total_metrics_result = await session.execute(total_metrics_query)
            total_metrics = total_metrics_result.scalar()
            
            print(f"📊 Total metrics records in database: {total_metrics}")
            
            if total_metrics == 0:
                print("\n💡 To populate metrics:")
                print("   1. Run: uv run python scripts/seed_complete_data.py")
                print("   2. Call API endpoint: GET /api/v1/clients/")
                print("   3. Run this script again to see updated metrics")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(check_metrics_in_db())
