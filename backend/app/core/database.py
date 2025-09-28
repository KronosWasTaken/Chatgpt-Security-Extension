import logging
from typing import AsyncGenerator,Optional

from sqlalchemy import create_engine,event,text

from sqlalchemy.ext.asyncio import AsyncSession,create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


logger=logging.getLogger(__name__)

sync_engine=create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.DEBUG
)

async_engine = create_async_engine(
    settings.DATABASE_URL_ASYNC,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=settings.DEBUG,
     pool_size=5,
    max_overflow=10
)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

AsyncSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)


async def get_async_session()->AsyncGenerator[AsyncSession,None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

def get_sync_session():
    session=SessionLocal()
    try:
        yield session
    except Exception:
         session.rollback()
    finally:
        session.close()
        
        
async def init_db() ->None:
    try:
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection established")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise
        
            