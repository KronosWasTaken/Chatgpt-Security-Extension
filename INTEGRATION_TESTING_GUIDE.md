# Integration Testing Guide

## Quick Start

### 1. Start the Backend
```bash
cd backend
# Make sure you have .env file configured
# Install dependencies if needed: pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`

### 2. Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder from the project root
5. Click the extension icon to open options page

### 3. Test the Integration

#### Test Case 1: Valid Prompt Detection
1. Go to ChatGPT or any AI chat interface
2. Type some text in the input field
3. Extension should auto-detect the prompt
4. Open extension options page
5. Click " API Logs" button in bottom-right
6. Verify logs show:
   -  Green success indicator
   - Correlation ID in logs
   - Request/response details

#### Test Case 2: Error Handling
1. Stop the backend server
2. Type in ChatGPT input field
3. Extension should handle error gracefully
4. Check API logs popup:
   -  Red error indicator
   - Error details visible
   - Network error message

#### Test Case 3: Validation Errors
1. Start backend
2. Manually trigger API call with invalid data
3. Backend should return 400 with:
   - Field-level error details
   - Correlation ID
   - Structured error format

### 4. Monitor Logs

#### Server Logs (Terminal)
Look for structured logs like:
```
prompt_analysis_request corrId=abc123 length=42 clientId=acme-health mspId=msp-001
prompt_analysis_success corrId=abc123 riskLevel=safe shouldBlock=False piiCount=0
validation_error corrId=xyz789 method=POST path=/api/v1/analyze/prompt errors=1
```

#### Extension Logs (Browser Console)
Open Developer Tools → Console
Look for logs like:
```
 Analyzing prompt with backend: {promptLength: 42, url: "http://localhost:8000/api/v1/analyze/prompt", hasAuth: true}
 Backend response received: {status: 200, correlationId: "abc123"}
 Backend prompt analysis completed: {result: {...}, correlationId: "abc123"}
```

#### API Logs Popup (UI)
Click " API Logs" button in options page
- Real-time success/error indicators
- Expandable details
- Timestamps

## Expected Behavior

### Success Flow
1. User types in text input
2. Extension detects text change
3. Extension calls POST /api/v1/analyze/prompt
4. Backend validates request
5. Backend analyzes prompt
6. Backend returns response with correlation ID
7. Extension logs success to chrome.storage.local
8. Popup UI shows green success log

### Error Flow
1. User types in text input
2. Extension detects text change
3. Extension calls POST /api/v1/analyze/prompt
4. Backend returns error or network fails
5. Extension logs error with details
6. Popup UI shows red error log

### Validation Error Flow
1. Extension sends invalid data (missing text field)
2. Backend Pydantic validation fails
3. Global exception handler catches error
4. Backend returns 400 with field-level errors
5. Extension logs validation error
6. Popup UI shows detailed error message

## Troubleshooting

### HTTP 400 Errors
- Check backend logs for validation_error entries
- Verify request body includes "text" field with at least 1 character
- Check correlation ID in both extension and backend logs

### CORS Issues
- Verify backend CORS middleware is configured
- Check extension origin matches chrome-extension:// pattern
- Ensure preflight OPTIONS requests are handled

### Missing Logs
- Check chrome.storage.local permissions in manifest
- Verify storage is not being cleared
- Check browser console for JavaScript errors

### Backend Not Responding
- Verify backend server is running on port 8000
- Check firewall settings
- Verify .env file has correct configuration

## Verification Checklist

- [ ] Backend starts without errors
- [ ] Extension loads successfully
- [ ] Options page opens and shows API logs button
- [ ] Typing in ChatGPT triggers API calls
- [ ] Server logs show structured format with correlation IDs
- [ ] API logs popup shows real-time activity
- [ ] Success indicators show green
- [ ] Error indicators show red
- [ ] Correlation IDs match between extension and backend
- [ ] No HTTP 400 errors (unless validation failure)
- [ ] No CORS errors in browser console
- [ ] Logs persist across page refreshes

## Next Steps

If integration is successful:
1. Monitor logs for any edge cases
2. Check error handling under load
3. Verify log retention (last 100 entries)
4. Test with real ChatGPT prompts
5. Check server-side log persistence

## Support

If issues persist:
1. Check both browser console and server logs
2. Verify correlation IDs match between client and server
3. Check chrome.storage.local in DevTools → Application
4. Verify all dependencies are installed
5. Check backend .env configuration
