import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from app.services.metrics_updater import run_metrics_update

async def main():
    """Update all client metrics"""
    print("🔄 Updating client metrics...")
    await run_metrics_update()
    print("✅ Metrics update completed!")

if __name__ == "__main__":
    asyncio.run(main())
