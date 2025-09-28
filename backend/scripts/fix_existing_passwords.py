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

async def fix_existing_passwords():
    """Fix any existing users with malformed bcrypt hashes"""
    
    async for session in get_async_session():
        try:
            print("🔧 Fixing existing user passwords...")
            
            # Get all users
            users_query = select(User)
            users_result = await session.execute(users_query)
            users = users_result.scalars().all()
            
            print(f"Found {len(users)} users in database")
            
            for user in users:
                print(f"Checking user: {user.email}")
                
                # Check if password hash is malformed
                try:
                    # Try to verify with a dummy password to test hash format
                    pwd_context.verify("dummy", user.hashed_password)
                except Exception as e:
                    if "malformed bcrypt hash" in str(e).lower():
                        print(f"  ❌ Malformed hash found for {user.email}")
                        
                        # Fix the password hash
                        user.hashed_password = pwd_context.hash("admin123")
                        print(f"  ✅ Fixed password hash for {user.email}")
                    else:
                        print(f"  ⚠️  Other error for {user.email}: {e}")
                else:
                    print(f"  ✅ Password hash is valid for {user.email}")
            
            await session.commit()
            print("✅ Password fixes completed!")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error fixing passwords: {e}")
            raise
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(fix_existing_passwords())
