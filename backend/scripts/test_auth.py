import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_session
from app.models import User
from sqlalchemy import select
from passlib.context import CryptContext

# Create password context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def test_authentication():
    """Test user authentication with proper passlib bcrypt"""
    
    async for session in get_async_session():
        try:
            print("🧪 Testing User Authentication")
            print("=" * 40)
            
            # Get first user
            user_query = select(User).limit(1)
            user_result = await session.execute(user_query)
            user = user_result.scalar_one_or_none()
            
            if not user:
                print("❌ No users found. Run seed script first.")
                return
            
            print(f"Testing user: {user.email}")
            print(f"Password hash: {user.hashed_password[:50]}...")
            
            # Test password verification
            test_password = "admin123"
            
            try:
                is_valid = pwd_context.verify(test_password, user.hashed_password)
                if is_valid:
                    print(f"✅ Password '{test_password}' is valid!")
                else:
                    print(f"❌ Password '{test_password}' is invalid")
            except Exception as e:
                print(f"❌ Error verifying password: {e}")
                print("This indicates a malformed bcrypt hash")
                
                # Fix the hash
                print("🔧 Fixing password hash...")
                user.hashed_password = pwd_context.hash(test_password)
                await session.commit()
                print("✅ Password hash fixed!")
                
                # Test again
                is_valid = pwd_context.verify(test_password, user.hashed_password)
                if is_valid:
                    print(f"✅ Password '{test_password}' is now valid!")
                else:
                    print(f"❌ Password '{test_password}' is still invalid")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(test_authentication())
