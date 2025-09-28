import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.api.v1.endpoints.ai_inventory import get_ai_inventory
from fastapi import Request

async def test_ai_inventory():
    """Test that AI inventory includes risk_score and active_users"""
    
    async for session in get_async_session():
        try:
            print("🧪 Testing AI Inventory with Risk Score and Active Users")
            print("=" * 60)
            
            # Create a mock request
            class MockRequest:
                def __init__(self):
                    self.state = type('obj', (object,), {
                        'user': {
                            'role': 'msp_admin',
                            'msp_id': '00000000-0000-0000-0000-000000000000'  # Will be replaced
                        }
                    })()
            
            # Get first MSP from database
            from app.models import MSP
            from sqlalchemy import select
            
            msp_query = select(MSP).limit(1)
            msp_result = await session.execute(msp_query)
            msp = msp_result.scalar_one_or_none()
            
            if not msp:
                print("❌ No MSP found. Run seed script first.")
                return
            
            mock_request = MockRequest()
            mock_request.state.user['msp_id'] = str(msp.id)
            
            # Call the AI inventory endpoint
            inventory_data = await get_ai_inventory(mock_request, session)
            
            print(f"📊 Found {len(inventory_data)} clients with AI inventory")
            print()
            
            for client_data in inventory_data:
                print(f"🏢 Client: {client_data['clientName']}")
                print(f"   Items: {len(client_data['items'])}")
                
                for item in client_data['items']:
                    print(f"   📱 {item['name']} ({item['type']})")
                    print(f"      Vendor: {item['vendor']}")
                    print(f"      Users: {item['users']}")
                    print(f"      Active Users: {item.get('active_users', 'MISSING')}")
                    print(f"      Risk Score: {item.get('risk_score', 'MISSING')}")
                    print(f"      Status: {item['status']}")
                    print(f"      Daily Interactions: {item['avgDailyInteractions']}")
                    print()
            
            # Check if all items have the required fields
            all_items_have_fields = True
            for client_data in inventory_data:
                for item in client_data['items']:
                    if 'risk_score' not in item or 'active_users' not in item:
                        all_items_have_fields = False
                        print(f"❌ Missing fields in {item['name']}")
            
            if all_items_have_fields:
                print("✅ All inventory items have risk_score and active_users!")
            else:
                print("❌ Some inventory items are missing required fields")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(test_ai_inventory())
