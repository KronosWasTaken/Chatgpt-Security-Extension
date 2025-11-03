"""Final test script for analyze/prompt and audit/events endpoints"""
import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000"


async def test_analyze_prompt():
    """Test POST /api/v1/analyze/prompt"""
    print("\n=== Test 1: POST /api/v1/analyze/prompt ===")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Test with valid JSON
        response = await client.post(
            f"{BASE_URL}/api/v1/analyze/prompt",
            json={
                "text": "This is a test prompt for analysis"
            },
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        print(f"Correlation ID: {response.headers.get('x-correlation-id', 'none')}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success")
            print(f"  Risk Level: {data.get('riskLevel')}")
            print(f"  Should Block: {data.get('shouldBlock')}")
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"  Response: {response.text}")


async def test_analyze_prompt_wrong_content_type():
    """Test POST /api/v1/analyze/prompt with wrong Content-Type"""
    print("\n=== Test 2: POST /api/v1/analyze/prompt (wrong Content-Type) ===")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{BASE_URL}/api/v1/analyze/prompt",
            json={"text": "test"},
            headers={"Content-Type": "text/plain"}  # Wrong content type
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 415:
            print(f"✅ Correctly returned 415 (Unsupported Media Type)")
            data = response.json()
            print(f"  Expected: {data.get('expected')}")
            print(f"  Received: {data.get('received')}")
        else:
            print(f"❌ Unexpected status: {response.status_code}")
            print(f"  Response: {response.text}")


async def test_audit_events_create():
    """Test POST /api/v1/audit/events"""
    print("\n=== Test 3: POST /api/v1/audit/events ===")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{BASE_URL}/api/v1/audit/events",
            json={
                "event_type": "test_event",
                "event_category": "test",
                "severity": "info",
                "message": "Test audit log entry",
                "source": "extension"
            },
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        print(f"Correlation ID: {response.headers.get('x-correlation-id', 'none')}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success")
            print(f"  Log ID: {data.get('log_id')}")
            print(f"  Message: {data.get('message')}")
            return data.get('log_id')
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return None


async def test_audit_events_search():
    """Test POST /api/v1/audit/events/search"""
    print("\n=== Test 4: POST /api/v1/audit/events/search ===")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{BASE_URL}/api/v1/audit/events/search",
            json={
                "level": "info",
                "limit": 10,
                "offset": 0
            },
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {response.status_code}")
        print(f"Correlation ID: {response.headers.get('x-correlation-id', 'none')}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success")
            print(f"  Total: {data.get('total')}")
            print(f"  Logs returned: {len(data.get('logs', []))}")
            print(f"  Has more: {data.get('has_more')}")
        else:
            print(f"❌ Failed: {response.status_code}")
            print(f"  Response: {response.text}")


async def test_cors_preflight():
    """Test OPTIONS preflight request"""
    print("\n=== Test 5: OPTIONS preflight ===")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.options(
            f"{BASE_URL}/api/v1/analyze/prompt",
            headers={
                "Origin": "chrome-extension://test",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ Preflight successful")
            print(f"  Access-Control-Allow-Origin: {response.headers.get('access-control-allow-origin', 'none')}")
            print(f"  Access-Control-Allow-Methods: {response.headers.get('access-control-allow-methods', 'none')}")
        else:
            print(f"❌ Preflight failed: {response.status_code}")


async def main():
    print("Starting endpoint tests...")
    
    await test_analyze_prompt()
    await test_analyze_prompt_wrong_content_type()
    log_id = await test_audit_events_create()
    await test_audit_events_search()
    await test_cors_preflight()
    
    print("\n=== Tests Complete ===")


if __name__ == "__main__":
    asyncio.run(main())
