

import logging
from typing import AsyncGenerator, Optional

from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings

logger = logging.getLogger(__name__)


sync_engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.DEBUG,
)


async_engine = create_async_engine(
    settings.DATABASE_URL_ASYNC,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.DEBUG,
    poolclass=StaticPool,
)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)
AsyncSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:

    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_sync_session():

    session = SessionLocal()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


async def init_db() -> None:

    try:

        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        
        logger.info("Database connection established")
        

        await setup_rls_policies()
        
        logger.info("Database initialization complete")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise


async def setup_rls_policies() -> None:

    try:
        async with async_engine.begin() as conn:
            # Enable RLS on all tenant tables
            await conn.execute(text("""
                ALTER TABLE shared.ai_services ENABLE ROW LEVEL SECURITY;
                ALTER TABLE shared.compliance_frameworks ENABLE ROW LEVEL SECURITY;
                ALTER TABLE shared.detection_patterns ENABLE ROW LEVEL SECURITY;
            """))
            
            logger.info("RLS policies setup complete")
            
    except Exception as e:
        logger.warning(f"RLS setup failed (may already exist): {e}")


class TenantContext:

    
    def __init__(
        self,
        msp_id: str,
        client_id: Optional[str] = None,
        user_id: Optional[str] = None,
        role: Optional[str] = None,
    ):
        self.msp_id = msp_id
        self.client_id = client_id
        self.user_id = user_id
        self.role = role
    
    async def set_context(self, session: AsyncSession) -> None:


        if self.client_id:
            search_path = f"msp_{self.msp_id}_client_{self.client_id}, msp_{self.msp_id}, shared"
        else:
            search_path = f"msp_{self.msp_id}, shared"
        
        await session.execute(text(f"SET search_path TO {search_path}"))
        await session.execute(text(f"SET app.current_msp_id TO '{self.msp_id}'"))
        
        if self.client_id:
            await session.execute(text(f"SET app.current_client_id TO '{self.client_id}'"))
        
        if self.user_id:
            await session.execute(text(f"SET app.current_user_id TO '{self.user_id}'"))
        
        if self.role:
            await session.execute(text(f"SET app.current_user_role TO '{self.role}'"))



@event.listens_for(sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):

    if "sqlite" in str(dbapi_connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()



async def check_database_health() -> bool:

    try:
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
