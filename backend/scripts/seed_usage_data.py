import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import uuid
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.models import Client, ClientAIServices, User, ClientAIServiceUsage
from sqlalchemy import select
import random

async def seed_usage_data():
    """Seed usage data for testing average daily interactions calculation"""
    
    async for session in get_async_session():
        try:
            print("🌱 Seeding AI Service Usage Data")
            print("=" * 40)
            
            # Get first client
            client_query = select(Client).limit(1)
            client_result = await session.execute(client_query)
            client = client_result.scalar_one_or_none()
            
            if not client:
                print("❌ No clients found. Run seed script first.")
                return
            
            # Get AI services for this client
            ai_services_query = select(ClientAIServices).where(
                ClientAIServices.client_id == client.id
            )
            ai_services_result = await session.execute(ai_services_query)
            ai_services = ai_services_result.scalars().all()
            
            if not ai_services:
                print("❌ No AI services found for client. Run seed script first.")
                return
            
            # Get users for this client
            users_query = select(User).where(User.msp_id == client.msp_id)
            users_result = await session.execute(users_query)
            users = users_result.scalars().all()
            
            if not users:
                print("❌ No users found. Run seed script first.")
                return
            
            print(f"📊 Creating usage data for client: {client.name}")
            print(f"   AI Services: {len(ai_services)}")
            print(f"   Users: {len(users)}")
            
            # Create usage data for the last 30 days
            usage_records = []
            base_date = date.today()
            
            for service in ai_services:
                for day_offset in range(30):
                    usage_date = base_date - timedelta(days=day_offset)
                    
                    # Create 1-3 usage records per service per day
                    num_records = random.randint(1, 3)
                    
                    for _ in range(num_records):
                        user = random.choice(users)
                        
                        # Generate realistic daily interactions
                        base_interactions = service.avg_daily_interactions or 100
                        daily_interactions = max(0, int(
                            base_interactions * random.uniform(0.5, 1.5) + random.randint(-20, 20)
                        ))
                        
                        usage_record = ClientAIServiceUsage(
                            client_id=client.id,
                            ai_service_id=service.ai_service_id,
                            user_id=user.id,
                            department=random.choice(["Sales", "Marketing", "Engineering", "Support", "Finance"]),
                            daily_interactions=daily_interactions,
                            total_interactions=random.randint(100, 5000),
                            created_at=usage_date
                        )
                        usage_records.append(usage_record)
            
            # Add all usage records to session
            for record in usage_records:
                session.add(record)
            
            await session.commit()
            
            print(f"✅ Created {len(usage_records)} usage records")
            print(f"   Date range: {(base_date - timedelta(days=29)).strftime('%Y-%m-%d')} to {base_date.strftime('%Y-%m-%d')}")
            print(f"   Average records per service per day: {len(usage_records) // (len(ai_services) * 30):.1f}")
            
            # Test the calculation
            print("\n🧪 Testing average daily interactions calculation:")
            for service in ai_services:
                from app.api.v1.endpoints.ai_inventory import calculate_avg_daily_interactions
                avg_interactions = await calculate_avg_daily_interactions(
                    session, str(client.id), str(service.ai_service_id)
                )
                print(f"   {service.name}: {avg_interactions} avg daily interactions")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error seeding usage data: {e}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(seed_usage_data())
