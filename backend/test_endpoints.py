"""Test script for API endpoints using httpx"""
import asyncio
import httpx
import os
import tempfile

BASE_URL = "http://localhost:8000"


async def test_login():
    """Login and get token"""
    print("=== Step 1: Login ===")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={
                "email": "admin@example.com",
                "password": "admin123"
            },
            timeout=10.0
        )
        
        if response.status_code != 200:
            print(f" Login failed: {response.status_code} - {response.text}")
            return None
        
        token = response.json().get("access_token")
        print(f" Token obtained: {token[:20]}...")
        return token


async def test_analyze_prompt(token: str):
    """Test analyze/prompt endpoint"""
    print("\n=== Step 2: Test POST /api/v1/analyze/prompt ===")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/v1/analyze/prompt",
            json={
                "text": "This is a test prompt for analysis",
                "clientId": "acme-health",
                "mspId": "msp-001"
            },
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0
        )
        
        print(f"Status: {response.status_code}")
        print(f"Correlation ID: {response.headers.get('x-correlation-id', 'none')}")
        
        if response.status_code == 200:
            data = response.json()
            print(f" Prompt analysis successful")
            print(f"  Risk Level: {data.get('riskLevel')}")
            print(f"  Should Block: {data.get('shouldBlock')}")
        else:
            print(f" Failed: {response.status_code}")
            print(f"  Response: {response.text}")


async def test_scan_file(token: str):
    """Test scan/file endpoint"""
    print("\n=== Step 3: Test POST /api/v1/scan/file ===")
    
    # Create a test file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write("This is test file content for scanning")
        test_file = f.name
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(test_file, 'rb') as f:
                files = {"file": ("test.txt", f, "text/plain")}
                data = {"text": "Some text content"}
                headers = {"Authorization": f"Bearer {token}"}
                
                response = await client.post(
                    f"{BASE_URL}/api/v1/scan/file",
                    files=files,
                    data=data,
                    headers=headers
                )
                
                print(f"Status: {response.status_code}")
                print(f"Correlation ID: {response.headers.get('x-correlation-id', 'none')}")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f" File scan successful")
                    print(f"  Risk Level: {data.get('riskLevel')}")
                    print(f"  Is Malicious: {data.get('isMalicious')}")
                else:
                    print(f" Failed: {response.status_code}")
                    try:
                        print(f"  Response: {response.json()}")
                    except:
                        print(f"  Response: {response.text}")
    
    finally:
        os.unlink(test_file)


async def test_endpoint_without_auth():
    """Test analyze/prompt without auth (should work based on skip_auth_paths)"""
    print("\n=== Step 4: Test POST /api/v1/analyze/prompt without auth ===")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/v1/analyze/prompt",
            json={
                "text": "Test prompt without auth",
            },
            timeout=30.0
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f" Works without auth (as expected)")
        else:
            print(f" Failed: {response.status_code}")
            print(f"  Response: {response.text}")


async def main():
    print("Starting API endpoint tests...\n")
    
    # Test login
    token = await test_login()
    if not token:
        print("\n Cannot proceed without token")
        return
    
    # Test analyze/prompt with auth
    await test_analyze_prompt(token)
    
    # Test analyze/prompt without auth
    await test_endpoint_without_auth()
    
    # Test scan/file (requires auth)
    await test_scan_file(token)
    
    print("\n=== Tests Complete ===")


if __name__ == "__main__":
    asyncio.run(main())
