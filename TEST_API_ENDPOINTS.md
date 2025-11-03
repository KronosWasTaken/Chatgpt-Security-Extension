# API Endpoint Testing Guide

## Test Both Endpoints for HTTP 400 Errors

### Prerequisites
1. Backend running on `http://localhost:8000`
2. User logged in (get bearer token)
3. Extension loaded and configured

## Test 1: POST /api/v1/analyze/prompt

### cURL Test
```bash
curl -X POST http://localhost:8000/api/v1/analyze/prompt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "text": "This is a test prompt",
    "clientId": "acme-health",
    "mspId": "msp-001"
  }'
```

### Expected Response
```json
{
  "isThreats": false,
  "threats": [],
  "riskLevel": "safe",
  "summary": "...",
  "shouldBlock": false,
  ...
}
```

## Test 2: POST /api/v1/scan/file

### cURL Test
```bash
curl -X POST http://localhost:8000/api/v1/scan/file \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@test.txt" \
  -F "text=some text content"
```

### Python httpx Test
```python
import httpx
import asyncio

async def test_scan_file():
    token = "YOUR_TOKEN_HERE"
    
    async with httpx.AsyncClient() as client:
        # Create test file
        with open("test.txt", "wb") as f:
            f.write(b"test content")
        
        # Upload file
        with open("test.txt", "rb") as f:
            files = {"file": ("test.txt", f, "text/plain")}
            data = {"text": "some text"}
            headers = {"Authorization": f"Bearer {token}"}
            
            response = await client.post(
                "http://localhost:8000/api/v1/scan/file",
                files=files,
                data=data,
                headers=headers,
                timeout=30.0
            )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")

asyncio.run(test_scan_file())
```

## Common Issues to Check

### 1. Missing Content-Type Header
- Prompt endpoint requires: `Content-Type: application/json`
- File endpoint: Don't set Content-Type (browser does it)

### 2. Invalid Token
- Token expired or malformed
- Check token format: `Bearer <token>`

### 3. CORS Issues
- Preflight OPTIONS request fails
- Check browser console for CORS errors
- Verify backend CORS middleware is active

### 4. Request Body Validation
- Prompt: `text` field must be non-empty string
- File: `file` must be actual file, not empty

### 5. Correlation ID
- Check response headers for `X-Correlation-ID`
- Use this ID to trace logs on backend

## Debugging Steps

1. **Check backend logs** for validation errors
2. **Check browser network tab** for request/response
3. **Check correlation ID** in response headers
4. **Verify token** is valid and not expired
5. **Check CORS preflight** succeeded
