# HTTP 400 Error Fix Plan

## Problem Statement
Extension is receiving HTTP 400 errors on:
1. `POST /api/v1/analyze/prompt`
2. `POST /api/v1/scan/file`

## Root Cause Analysis

### Endpoint 1: `/api/v1/analyze/prompt`
**Status**: In `skip_auth_paths` - doesn't require authentication ✅
**Expected Request**:
```json
{
  "text": "string (required, min_length=1)",
  "clientId": "string (optional)",
  "mspId": "string (optional)"
}
```

**Potential Issues**:
- Missing `text` field
- Empty string in `text` field
- Malformed JSON
- Wrong Content-Type header

### Endpoint 2: `/api/v1/scan/file`
**Status**: NOT in `skip_auth_paths` - REQUIRES authentication ⚠️
**Expected Request**:
- Multipart form data
- Required field: `file` (UploadFile)
- Optional field: `text` (str via Form)

**Potential Issues**:
- Missing auth token
- Invalid form data structure
- Missing `file` field
- Wrong content type

## Fix Plan

### Phase 1: Backend Fixes

#### 1.1 Ensure Proper Error Messages
- [x] Add global exception handler for RequestValidationError
- [ ] Add detailed logging with correlation IDs
- [ ] Return structured error responses with field-level details

#### 1.2 CORS Configuration
- [x] CORS middleware configured correctly
- [x] Allows chrome-extension:// origins
- [x] Includes necessary headers

#### 1.3 Auth Requirements
- [x] `/api/v1/analyze/prompt` - NO auth required
- [ ] `/api/v1/scan/file` - Auth required
- [ ] Ensure token validation works properly

### Phase 2: Frontend Fixes

#### 2.1 Analyze Prompt Request
```typescript
const payload = {
  text: text,  // Ensure non-empty
  clientId: config.clientId,
  mspId: config.mspId
}

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`  // Optional for prompt
  },
  body: JSON.stringify(payload)
})
```

#### 2.2 Scan File Request
```typescript
const formData = new FormData()
formData.append('file', file)  // Ensure file is actual File object
if (text) formData.append('text', text)

const response = await fetch(url,和治疗  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`  // Required for file scan
    // Don't set Content-Type - browser sets it with boundary
  },
  body: formData
})
```

#### 2.3 Error Handling
- Capture correlation ID from response headers
- Log to unified `logs` storage
- Display in UI popup
- Retry with better error messages

### Phase 3: Testing

#### 3.1 Manual Tests
- [ ] Run `python backend/test_endpoints.py`
- [ ] Run PowerShell script `test_api_endpoints.ps1`
- [ ] Test in browser console

#### 3.2 Extension Tests
- [ ] Type in ChatGPT - trigger prompt analysis
- [ ] Upload file - trigger file scan
- [ ] Check API logs popup
- [ ] Verify correlation IDs match

#### 3.3 Regression Tests
- [ ] Prompt blocking still works
- [ ] File scanning still works
- [ ] Existing features unchanged
- [ ] Logging works correctly

## Implementation Checklist

### Backend
- [x] Global exception handler for 400 errors
- [x] Correlation ID middleware
- [x] CORS configuration
- [ ] Log validation errors with details
- [ ] Test endpoints respond correctly

### Frontend
- [x] Unified logging system
- [ ] Fix payload format for both endpoints
- [ ] Add proper headers
- [ ] Handle preflight requests
- [ ] Log to UI

### Auth
- [ ] Ensure token is stored in chrome.storage
- [ ] Reuse token across requests
- [ ] Handle token expiration
- [ ] Silent refresh if needed

### Documentation
- [x] Test scripts
- [x] Fix plan
- [ ] Manual testing guide
- [ ] Deployment notes

## Expected Outcomes

1. **No more HTTP 400 errors** on either endpoint
2. **Clear error messages** if validation fails
3. **Structured logging** on both frontend and backend
4. **Correlation IDs** for request tracking
5. **UI feedback** with real-time API logs
6. **All existing features** continue to work

## Success Criteria

- ✅ All tests pass
- ✅ No 400 errors in logs
- ✅ Correlation IDs present in all responses
- ✅ Logs visible in UI popup
- ✅ Request/response format validated
- ✅ CORS working properly
- ✅ Auth flow working correctly
