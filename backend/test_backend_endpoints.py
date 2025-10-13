#!/usr/bin/env python3
"""
Quick test script to verify the backend file scanning endpoint is working
"""

import requests
import json
import tempfile
import os

def test_backend_endpoints():
    """Test the backend endpoints"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Backend Endpoints")
    print("=" * 40)
    
    # Test 1: Health check
    print("\n1. Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("   ✅ Health check passed")
            print(f"   Response: {response.json()}")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Health check error: {e}")
    
    # Test 2: Scan test endpoint
    print("\n2. Testing scan test endpoint...")
    try:
        response = requests.get(f"{base_url}/api/v1/scan/test")
        if response.status_code == 200:
            print("   ✅ Scan test endpoint passed")
            print(f"   Response: {response.json()}")
        else:
            print(f"   ❌ Scan test endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Scan test endpoint error: {e}")
    
    # Test 3: File scan endpoint
    print("\n3. Testing file scan endpoint...")
    try:
        # Create a test file
        test_content = "This is a test file with some content."
        test_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        test_file.write(test_content)
        test_file.close()
        
        # Test file scan
        with open(test_file.name, 'rb') as f:
            files = {'file': ('test.txt', f, 'text/plain')}
            data = {'text': test_content}
            response = requests.post(f"{base_url}/api/v1/scan/file", files=files, data=data)
        
        # Clean up
        os.unlink(test_file.name)
        
        if response.status_code == 200:
            print("   ✅ File scan endpoint passed")
            result = response.json()
            print(f"   Response: {json.dumps(result, indent=2)}")
        else:
            print(f"   ❌ File scan endpoint failed: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   ❌ File scan endpoint error: {e}")
    
    # Test 4: Test with sensitive file
    print("\n4. Testing with sensitive file (.env)...")
    try:
        # Create a test .env file
        env_content = "DATABASE_URL=postgresql://user:password@localhost:5432/db\nAPI_KEY=sk-1234567890abcdef"
        env_file = tempfile.NamedTemporaryFile(mode='w', suffix='.env', delete=False)
        env_file.write(env_content)
        env_file.close()
        
        # Test file scan
        with open(env_file.name, 'rb') as f:
            files = {'file': ('.env', f, 'text/plain')}
            data = {'text': env_content}
            response = requests.post(f"{base_url}/api/v1/scan/file", files=files, data=data)
        
        # Clean up
        os.unlink(env_file.name)
        
        if response.status_code == 200:
            print("   ✅ Sensitive file scan completed")
            result = response.json()
            print(f"   Should Block: {result.get('shouldBlock', False)}")
            print(f"   Risk Level: {result.get('riskLevel', 'unknown')}")
            print(f"   Block Reason: {result.get('blockReason', 'None')}")
        else:
            print(f"   ❌ Sensitive file scan failed: {response.status_code}")
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   ❌ Sensitive file scan error: {e}")
    
    print("\n" + "=" * 40)
    print("✅ Backend endpoint testing completed!")

if __name__ == "__main__":
    test_backend_endpoints()
