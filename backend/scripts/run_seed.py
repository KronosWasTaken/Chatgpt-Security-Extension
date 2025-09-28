#!/usr/bin/env python3
"""
Simple script to run the mock data seeding
"""

import asyncio
import sys
import os

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from seed_mock_data import main

if __name__ == "__main__":
    print("🚀 Starting mock data seeding...")
    try:
        asyncio.run(main())
        print("\n✅ Seeding completed successfully!")
    except Exception as e:
        print(f"\n❌ Seeding failed: {e}")
        sys.exit(1)
