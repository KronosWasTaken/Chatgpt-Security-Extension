# CORS Configuration for Browser Extensions

This guide covers CORS setup for browser extensions calling the `/api/v1/analyze/prompt` endpoint.

## Quick Start

### 1. Configure CORS Origins

Edit `.env` file:

```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,chrome-extension://*,moz-extension://*
```

### 2. Run Server

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Test CORS

```bash
chmod +x scripts/test_cors.sh
./scripts/test_cors.sh
```

Or run pytest:

```bash
pytest tests/test_cors_analyze.py -v
```

## Endpoint Details

### POST `/api/v1/analyze/prompt`

**Request:**
```json
{
  "text": "string"
}
```

**Response (200 OK):**
```json
{
  "isThreats": false,
  "threats": [],
  "riskLevel": "low",
  "summary": "...",
  "quickPattern": null,
  "dangerousPattern": null,
  "shouldBlock": false,
  "blockReason": null,
  "piiDetection": {
    "hasPII": false,
    "types": [],
    "count": 0,
    "riskLevel": "low"
  }
}
```

**Invalid Request (422):**
```json
{
  "error": "Invalid schema: { text: string } required"
}
```

## CORS Preflight (OPTIONS)

The endpoint automatically handles OPTIONS requests for CORS preflight.

**Expected Response:**
- Status: 200 or 204
- Headers: `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, etc.

## Extension Integration

### Manifest Permissions

```json
{
  "manifest_version": 3,
  "permissions": ["storage"],
  "host_permissions": [
    "http://localhost:8000/*",
    "https://your-backend.com/*"
  ]
}
```

### Example Usage

```typescript
const response = await fetch('http://localhost:8000/api/v1/analyze/prompt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'prompt to analyze'
  })
})

const data = await response.json()
console.log(data.isThreats, data.riskLevel)
```

## Common CORS Gotchas

### 1. Preflight 400 Error

**Symptom:** OPTIONS request returns 400

**Fix:** Ensure middleware is configured correctly:
```python
allow_methods=["POST", "OPTIONS"]
allow_headers=["Content-Type", "Authorization", "X-Requested-With"]
```

### 2. Extension Origin Not Allowed

**Symptom:** `Access-Control-Allow-Origin` header missing

**Fix:** Add to CORS_ORIGINS or use regex:
```python
allow_origin_regex=r"chrome-extension://.*|moz-extension://.*"
```

### 3. Credentials Not Sent

**Symptom:** Cookies/auth tokens not included

**Fix:** Add to fetch options:
```typescript
credentials: 'include'
```

And enable in CORS:
```python
allow_credentials=True
```

### 4. Headers Blocked

**Symptom:** Custom headers rejected

**Fix:** Add to `allow_headers`:
```python
allow_headers=["Content-Type", "X-Custom-Header"]
```

Or use wildcard (less secure):
```python
allow_headers=["*"]
```

### 5. Localhost Development

**Problem:** CORS blocks localhost:3000

**Fix:** Add to CORS_ORIGINS:
```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Testing

### Manual Test with curl

```bash
# Test preflight
curl -X OPTIONS \
  -H "Origin: chrome-extension://test" \
  -H "Access-Control-Request-Method: POST" \
  http://localhost:8000/api/v1/analyze/prompt

# Test POST
curl -X POST \
  -H "Origin: chrome-extension://test" \
  -H "Content-Type: application/json" \
  -d '{"text":"test"}' \
  http://localhost:8000/api/v1/analyze/prompt
```

### Automated Tests

Run pytest:

```bash
pytest tests/test_cors_analyze.py -v
```

## Logging

Structured access logs show:
```
method=OPTIONS path=/api/v1/analyze/prompt request_id=abc123 origin=chrome-extension://test preflight=true
method=OPTIONS path=/api/v1/analyze/prompt request_id=abc123 status=204 latency_ms=1
method=POST path=/api/v1/analyze/prompt request_id=def456 origin=chrome-extension://test preflight=false
method=POST path=/api/v1/analyze/prompt request_id=def456 status=200 latency_ms=45
```

## Troubleshooting

1. **Check server logs** for CORS errors
2. **Test with curl** first to isolate browser issues
3. **Verify environment variables** are loaded
4. **Check network tab** for preflight requests
5. **Ensure extension ID** is in allowed origins

For more help, see the main README.md

