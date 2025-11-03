# cURL Test Commands

## Prerequisites
- Backend running on `http://localhost:8000`
- No auth required for these endpoints

## Test 1: POST /api/v1/analyze/prompt

### Valid Request
```bash
curl -X POST http://localhost:8000/api/v1/analyze/prompt \
  -H "Content-Type: application/json" \
  -H "Origin: chrome-extension://test" \
  -d '{
    "text": "This is a test prompt for analysis"
  }'
```

Expected: **200 OK** with JSON response

### Invalid Content-Type (should return 415)
```bash
curl -X POST http://localhost:8000/api/v1/analyze/prompt \
  -H "Content-Type: text/plain" \
  -H "Origin: chrome-extension://test" \
  -d '{"text": "test"}'
```

Expected: **415 Unsupported Media Type**

### Missing Required Field (should return 422)
```bash
curl -X POST http://localhost:8000/api/v1/analyze/prompt \
  -H "Content-Type: application/json" \
  -H "Origin: chrome-extension://test" \
  -d '{}'
```

Expected: **422 Unprocessable Entity** with field-level errors

## Test 2: POST /api/v1/audit/events

### Valid Request
```bash
curl -X POST http://localhost:8000/api/v1/audit/events \
  -H "Content-Type: application/json" \
  -H "Origin: chrome-extension://test" \
  -d '{
    "event_type": "test_event",
    "event_category": "test",
    "severity": "info",
    "message": "Test audit log entry",
    "source": "extension"
  }'
```

Expected: **200 OK** with `{"success": true, "log_id": "...", "correlation_id": "..."}`

### Invalid Content-Type (should return 415)
```bash
curl -X POST http://localhost:8000/api/v1/audit/events \
  -H "Content-Type: text/plain" \
  -H "Origin: chrome-extension://test" \
  -d '{"event_type": "test"}'
```

Expected: **415 Unsupported Media Type**

### Missing Required Field (should return 422)
```bash
curl -X POST http://localhost:8000/api/v1/audit/events \
  -H "Content-Type: application/json" \
  -H "Origin: chrome-extension://test" \
  -d '{
    "event_type": "test"
  }'
```

Expected: **422 Unprocessable Entity** with field-level errors

## Test 3: POST /api/v1/audit/events/search

### Valid Request
```bash
curl -X POST http://localhost:8000/api/v1/audit/events/search \
  -H "Content-Type: application/json" \
  -H "Origin: chrome-extension://test" \
  -d '{
    "level": "info",
    "limit": 10,
    "offset": 0
  }'
```

Expected: **200 OK** with JSON response containing logs array

### Search with Text Filter
```bash
curl -X POST http://localhost:8000/api/v1/audit/events/search \
  -H "Content-Type: application/json" \
  -H "Origin: chrome-extension://test" \
  -d '{
    "search_text": "test",
    "limit": 20,
    "offset": 0
  }'
```

Expected: **200 OK** with filtered results

## Test 4: OPTIONS Preflight

### Test CORS Preflight
```bash
curl -X OPTIONS http://localhost:8000/api/v1/analyze/prompt \
  -H "Origin: chrome-extension://test" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

Expected: **200 OK** with CORS headers:
- `Access-Control-Allow-Origin: chrome-extension://test`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Correlation-ID`

## Test 5: Verify No 400 Errors

All the above requests should return:
- **200** for valid requests
- **422** for validation errors (not 400)
- **415** for wrong Content-Type (not 400)
- **401** for missing auth (if auth required)

Never **400** for normal inputs!

## Expected Response Headers

All responses should include:
- `X-Correlation-ID: <uuid>`
- `Access-Control-Allow-Origin: chrome-extension://test` (or *)
- `Access-Control-Allow-Credentials: true`
