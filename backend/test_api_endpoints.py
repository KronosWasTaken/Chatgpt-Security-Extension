#!/usr/bin/env python3
"""
Test script to verify backend API endpoints are working
"""

import requests
import json
import time

def test_backend_api():
    """Test the backend API endpoints"""
    base_url = "http://127.0.0.1:8001"
    
    print("🧪 Testing Backend API")
    print("=" * 40)
    
    # Test 1: Health check
    print("\n1. Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("   ✅ Health check passed")
            print(f"   Response: {response.json()}")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   ❌ Health check error: {e}")
    
    # Test 2: API docs
    print("\n2. Testing API documentation...")
    try:
        response = requests.get(f"{base_url}/docs", timeout=5)
        if response.status_code == 200:
            print("   ✅ API docs accessible")
        else:
            print(f"   ❌ API docs failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ API docs error: {e}")
    
    # Test 3: Test scan endpoint
    print("\n3. Testing scan test endpoint...")
    try:
        response = requests.get(f"{base_url}/api/v1/scan/test", timeout=5)
        if response.status_code == 200:
            print("   ✅ Scan test endpoint passed")
            print(f"   Response: {response.json()}")
        else:
            print(f"   ❌ Scan test endpoint failed: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   ❌ Scan test endpoint error: {e}")
    
    # Test 4: Test file scan endpoint
    print("\n4. Testing file scan endpoint...")
    try:
        # Create a simple test file content
        test_content = "This is a test file with some content."
        
        # Test file scan
        files = {'file': ('test.txt', test_content, 'text/plain')}
        data = {'text': test_content}
        response = requests.post(f"{base_url}/api/v1/scan/file", files=files, data=data, timeout=10)
        
        if response.status_code == 200:
            print("   ✅ File scan endpoint passed")
            result = response.json()
            print(f"   Response: {json.dumps(result, indent=2)}")
        else:
            print(f"   ❌ File scan endpoint failed: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   ❌ File scan endpoint error: {e}")
    
    print("\n" + "=" * 40)
    print("✅ Backend API testing completed!")

if __name__ == "__main__":
    test_backend_api()
