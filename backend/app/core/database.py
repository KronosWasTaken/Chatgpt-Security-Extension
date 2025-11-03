import logging
from typing import AsyncGenerator,Optional
import asyncio, sys

from sqlalchemy import create_engine,event,text

from sqlalchemy.ext.asyncio import AsyncSession,create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


logger=logging.getLogger(__name__)

# Ensure Windows compatible event loop policy for async drivers (tests & runtime)
if sys.platform.startswith("win"):
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

sync_engine=create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.DEBUG
)

# Lazy-created per-event-loop async engine/session to avoid cross-loop issues on Windows
async_engine = None  # type: ignore
AsyncSessionLocal = None  # type: ignore
_async_engine_loop_id: Optional[int] = None

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

async def _ensure_async_engine() -> None:
    global async_engine, AsyncSessionLocal
    loop = asyncio.get_running_loop()
    current_loop_id = id(loop)
    global _async_engine_loop_id
    if async_engine is None or _async_engine_loop_id != current_loop_id:
        # Dispose previous engine if present (best-effort)
        if async_engine is not None:
            try:
                await async_engine.dispose()
            except Exception:
                pass
        async_engine = create_async_engine(
            settings.DATABASE_URL_ASYNC,
            pool_pre_ping=True,
            pool_recycle=3600,
            echo=settings.DEBUG,
            pool_size=5,
            max_overflow=10
        )
        _async_engine_loop_id = current_loop_id
        AsyncSessionLocal = sessionmaker(
            async_engine, class_=AsyncSession, expire_on_commit=False
        )


async def get_async_session()->AsyncGenerator[AsyncSession,None]:
    await _ensure_async_engine()
    assert AsyncSessionLocal is not None
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
        await _ensure_async_engine()
        assert async_engine is not None
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection established")
        
        # Initialize SQLite extension logs table
        try:
            from app.models.extension_logs import ExtensionLog, ensure_table_exists
            ensure_table_exists(sync_engine)
            logger.info("Extension logs table initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize extension logs table: {e}")
            
    except Exception as e:
        logger.warning(f"Database initialization failed: {e}")
        logger.warning("Continuing without database connection for testing purposes")
        # Don't raise the exception to allow the app to start without database
        
            