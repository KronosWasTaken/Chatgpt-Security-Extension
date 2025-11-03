# Implementation Plan - HTTP 400 Fixes

## Target Endpoints
1. POST /api/v1/analyze/prompt
2. POST /api/v1/audit/events (create/search in one endpoint)

## Backend Tasks

### Phase 1: Error Handling & Validation
- [x] Global validation error handler (already done)
- [ ] Improve error responses (422 for validation, 401/403 for auth, 415 for media-type)
- [ ] Add structured logging with request IDs
- [ ] Strict Pydantic models for both endpoints

### Phase 2: Audit Events Endpoint
- [ ] Rewrite /api/v1/audit/events to support both:
  - CREATE: POST JSON with audit entry
  - SEARCH: POST JSON with filter criteria
- [ ] Return well-formed JSON, never 400
- [ ] Add correlation IDs

### Phase 3: Auth & CORS
- [ ] Add DEV login endpoint with bob@techcorp.com
- [ ] Ensure OPTIONS preflight handled
- [ ] Add auth dependency

### Phase 4: Logging
- [ ] Structured logging (method, path, status, request_id, body_length)
- [ ] No raw bytes in logs
- [ ] Request ID correlation

## Frontend Tasks

### Phase 1: Token Management
- [ ] Fetch bearer token on startup/login
- [ ] Cache in chrome.storage
- [ ] Reuse across all requests

### Phase 2: Request Fixes
- [ ] analyze/prompt: JSON with correct headers
- [ ] audit/events: Support both create and search modes
- [ ] Never set Content-Type for multipart
- [ ] Always set Content-Type for JSON

### Phase 3: Logging
- [ ] Visible logs in extension
- [ ] Optional backend log forwarding

## Test Tasks

### Phase 1: Unit Tests
- [ ] httpx tests for both endpoints
- [ ] pytest fixtures
- [ ] Mock auth

### Phase 2: Integration Tests
- [ ] curl commands for both endpoints
- [ ] Test with and without auth
- [ ] Test error cases

### Phase 3: Manual Testing
- [ ] Test in browser extension
- [ ] Verify logs
- [ ] Verify no 400 errors
