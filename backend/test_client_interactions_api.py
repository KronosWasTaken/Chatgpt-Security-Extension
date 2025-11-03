#!/usr/bin/env python3
"""
Test script for client interactions API endpoints
"""

import asyncio
import httpx
import json
from datetime import datetime, timedelta

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_CLIENT_ID = "b3de2004-de20-482c-b500-b6833fec8493"  # TechCorp Solutions
TEST_APP_ID = "app-1"  # ChatGPT application

async def test_client_interactions_api():
    """Test all client interaction API endpoints"""
    
    async with httpx.AsyncClient() as client:
        print("🧪 Testing Client Interactions API")
        print("=" * 50)
        
        # Test 1: Get client interactions
        print("\n1️⃣ Testing GET /clients/{client_id}/interactions")
        try:
            response = await client.get(f"{BASE_URL}/clients/{TEST_CLIENT_ID}/interactions")
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Client: {data.get('client_name', 'Unknown')}")
                print(f"   📊 Total interactions: {data.get('total_interactions', 0)}")
                print(f"   📈 Daily interactions: {data.get('daily_interactions', 0)}")
                print(f"   🎯 Risk score: {data.get('risk_score', 0)}")
            else:
                print(f"   ❌ Error: {response.text}")
        except Exception as e:
            print(f"   ❌ Exception: {e}")
        
        # Test 2: Get application interactions
        print(f"\n2️⃣ Testing GET /clients/{TEST_CLIENT_ID}/applications/{TEST_APP_ID}/interactions")
        try:
            response = await client.get(f"{BASE_URL}/clients/{TEST_CLIENT_ID}/applications/{TEST_APP_ID}/interactions")
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Application: {data.get('application_name', 'Unknown')}")
                print(f"   📊 Total interactions: {data.get('total_interactions', 0)}")
                print(f"   📈 Daily interactions: {data.get('daily_interactions', 0)}")
                print(f"   👥 Active users: {data.get('active_users', 0)}")
            else:
                print(f"   ❌ Error: {response.text}")
        except Exception as e:
            print(f"   ❌ Exception: {e}")
        
        # Test 3: Increment interaction count (simulating extension behavior)
        print(f"\n3️⃣ Testing POST /clients/{TEST_CLIENT_ID}/interactions/increment")
        try:
            payload = {
                "app_id": TEST_APP_ID,
                "interaction_count": 5,
                "interaction_type": "image_upload",
                "metadata": {
                    "file_count": 2,
                    "file_types": ["image/jpeg", "image/png"],
                    "total_size": 1024000,
                    "source": "extension"
                }
            }
            response = await client.post(
                f"{BASE_URL}/clients/{TEST_CLIENT_ID}/interactions/increment",
                json=payload
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Interaction incremented successfully")
                print(f"   📊 New total: {data.get('new_total', 0)}")
                print(f"   📈 Daily count: {data.get('daily_count', 0)}")
            else:
                print(f"   ❌ Error: {response.text}")
        except Exception as e:
            print(f"   ❌ Exception: {e}")
        
        # Test 4: Get updated client interactions
        print(f"\n4️⃣ Testing GET /clients/{TEST_CLIENT_ID}/interactions (after increment)")
        try:
            response = await client.get(f"{BASE_URL}/clients/{TEST_CLIENT_ID}/interactions")
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Updated total interactions: {data.get('total_interactions', 0)}")
                print(f"   📈 Updated daily interactions: {data.get('daily_interactions', 0)}")
            else:
                print(f"   ❌ Error: {response.text}")
        except Exception as e:
            print(f"   ❌ Exception: {e}")
        
        print("\n" + "=" * 50)
        print("🎉 Client Interactions API testing completed!")

if __name__ == "__main__":
    asyncio.run(test_client_interactions_api())
