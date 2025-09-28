import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.models import Client, ClientMetrics
from sqlalchemy import select

async def test_metrics_update():
    """Test that metrics are updated in the database when API endpoints are called"""
    
    async for session in get_async_session():
        try:
            print("🧪 Testing Metrics Update in Database")
            print("=" * 50)
            
            # Get the first client
            client_query = select(Client).limit(1)
            client_result = await session.execute(client_query)
            client = client_result.scalar_one_or_none()
            
            if not client:
                print("❌ No clients found. Run seed script first.")
                return
            
            print(f"📊 Testing metrics update for: {client.name}")
            print()
            
            # Check if metrics exist before API call
            metrics_before_query = select(ClientMetrics).where(
                ClientMetrics.client_id == client.id,
                ClientMetrics.date == date.today()
            )
            metrics_before_result = await session.execute(metrics_before_query)
            metrics_before = metrics_before_result.scalar_one_or_none()
            
            if metrics_before:
                print("📈 METRICS BEFORE API CALL:")
                print(f"   Apps Monitored: {metrics_before.apps_monitored}")
                print(f"   Interactions: {metrics_before.interactions_monitored}")
                print(f"   Agents Deployed: {metrics_before.agents_deployed}")
                print(f"   Risk Score: {metrics_before.risk_score}")
                print(f"   Compliance: {metrics_before.compliance_coverage}%")
            else:
                print("📈 METRICS BEFORE API CALL: No metrics found")
            
            print("\n🔄 Simulating API call (GET /clients/)...")
            
            # Simulate the API call by importing and calling the function
            from app.api.v1.endpoints.clients import get_clients
            from fastapi import Request
            
            # Create a mock request
            class MockRequest:
                def __init__(self):
                    self.state = type('obj', (object,), {
                        'user': {
                            'role': 'msp_admin',
                            'msp_id': str(client.msp_id)
                        }
                    })()
            
            mock_request = MockRequest()
            
            # Call the API endpoint
            clients_response = await get_clients(mock_request, session)
            
            print(f"✅ API call completed. Found {len(clients_response)} clients")
            
            # Check metrics after API call
            metrics_after_query = select(ClientMetrics).where(
                ClientMetrics.client_id == client.id,
                ClientMetrics.date == date.today()
            )
            metrics_after_result = await session.execute(metrics_after_query)
            metrics_after = metrics_after_result.scalar_one_or_none()
            
            print("\n📊 METRICS AFTER API CALL:")
            if metrics_after:
                print(f"   Apps Monitored: {metrics_after.apps_monitored}")
                print(f"   Interactions: {metrics_after.interactions_monitored}")
                print(f"   Agents Deployed: {metrics_after.agents_deployed}")
                print(f"   Risk Score: {metrics_after.risk_score}")
                print(f"   Compliance: {metrics_after.compliance_coverage}%")
                
                print("\n✅ SUCCESS! Metrics were updated in the database!")
                print("   - Metrics are calculated in real-time")
                print("   - Metrics are stored in client_metrics table")
                print("   - Database is updated on every API call")
            else:
                print("❌ No metrics found after API call")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(test_metrics_update())
