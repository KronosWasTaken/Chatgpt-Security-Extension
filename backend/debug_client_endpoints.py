#!/usr/bin/env python3
"""
Simple test to debug the client endpoint issues
"""

import asyncio
import httpx
import json

# Test configuration
BASE_URL = "http://localhost:8000"
BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MjliZTNlZS00MjcyLTQzODUtYmJkNS0yNDBmMzJlMmMxYmMiLCJlbWFpbCI6ImJvYkB0ZWNoY29ycC5jb20iLCJ0eXBlIjoiYWNjZXNzIiwibXNwX2lkIjpudWxsLCJjbGllbnRfaWQiOiJiM2RlMjAwNC1kZTIwLTQ4MmMtYjUwMC1iNjgzM2ZlYzg0OTMiLCJyb2xlIjoiY2xpZW50X2FkbWluIiwicGVybWlzc2lvbnMiOlsicmVhZCIsIndyaXRlIiwiYWRtaW4iXSwiZXhwIjoxNzYwNzk4MzM1fQ.JbHu5iepGtzJn-N4OUZY-A4HiFnVGC0IICOnQl0RbgU"
TEST_CLIENT_ID = "b3de2004-de20-482c-b500-b6833fec8493"

async def debug_client_endpoints():
    """Debug client endpoint issues"""
    
    headers = {
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        print(" Debugging Client Endpoints")
        print("=" * 40)
        
        # Test 1: Check if client exists in database
        print("\n1⃣ Testing client existence...")
        try:
            # Try to get all clients first
            response = await client.get(f"{BASE_URL}/api/v1/clients/", headers=headers)
            print(f"   GET /clients/ Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"    Found {len(data)} clients")
                for c in data:
                    print(f"      - {c.get('name', 'Unknown')} ({c.get('id', 'Unknown')})")
            else:
                print(f"    Error: {response.text}")
        except Exception as e:
            print(f"    Exception: {e}")
        
        # Test 2: Try specific client endpoint
        print(f"\n2⃣ Testing specific client endpoint...")
        try:
            response = await client.get(f"{BASE_URL}/api/v1/clients/{TEST_CLIENT_ID}", headers=headers)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"    Client data: {data.get('name', 'Unknown')}")
            else:
                print(f"    Error: {response.text}")
        except Exception as e:
            print(f"    Exception: {e}")
        
        # Test 3: Try dashboard endpoint
        print(f"\n3⃣ Testing dashboard endpoint...")
        try:
            response = await client.get(f"{BASE_URL}/api/v1/clients/{TEST_CLIENT_ID}/dashboard", headers=headers)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"    Dashboard data retrieved")
                print(f"    Apps monitored: {data.get('apps_monitored', 0)}")
            else:
                print(f"    Error: {response.text}")
        except Exception as e:
            print(f"    Exception: {e}")
        
        # Test 4: Try interactions endpoint
        print(f"\n4⃣ Testing interactions endpoint...")
        try:
            response = await client.get(f"{BASE_URL}/api/v1/clients/{TEST_CLIENT_ID}/interactions", headers=headers)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"    Interactions data retrieved")
                print(f"    Total interactions: {data.get('total_interactions', 0)}")
            else:
                print(f"    Error: {response.text}")
        except Exception as e:
            print(f"    Exception: {e}")
        
        # Test 5: Try interaction increment
        print(f"\n5⃣ Testing interaction increment...")
        try:
            payload = {
                "app_id": "app-1",
                "interaction_count": 1
            }
            response = await client.post(
                f"{BASE_URL}/api/v1/clients/{TEST_CLIENT_ID}/interactions/increment",
                json=payload,
                headers=headers
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"    Interaction incremented: {data}")
            else:
                print(f"    Error: {response.text}")
        except Exception as e:
            print(f"    Exception: {e}")
        
        print("\n" + "=" * 40)
        print(" Debug completed!")

if __name__ == "__main__":
    asyncio.run(debug_client_endpoints())
