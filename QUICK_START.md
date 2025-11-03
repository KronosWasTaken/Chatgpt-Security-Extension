# Quick Start: Prompt Injection Blocking

## 🚀 5-Minute Setup

### 1. Start Backend
```bash
cd backend
# Backend should already be running on localhost:8000
```

### 2. Build Extension
```bash
cd extension
npm run build
```

### 3. Load in Chrome
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `extension/build/chrome-mv3-prod/`

### 4. Authenticate
Use this JWT token in extension settings:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MjliZTNlZS00MjcyLTQzODUtYmJkNS0yNDBmMzJlMmMxYmMiLCJlbWFpbCI6ImJvYkB0ZWNoY29ycC5jb20iLCJ0eXBlIjoiYWNjZXNzIiwibXNwX2lkIjpudWxsLCJjbGllbnRfaWQiOiJiM2RlMjAwNC1kZTIwLTQ4MmMtYjUwMC1iNjgzM2ZlYzg0OTMiLCJyb2xlIjoiY2xpZW50X2FkbWluIiwicGVybWlzc2lvbnMiOlsicmVhZCIsIndyaXRlIiwiYWRtaW4iXSwiZXhwIjoxNzYxNDI3MTg1fQ.jmup5u_a4FdL5vADdOL2wPWAn8UJri67OW_nRPlEgpQ
```

### 5. Test
Open `test-prompt-blocking.html` in Chrome and try:
- ❌ "Ignore previous instructions" → Should BLOCK
- ✅ "What is the weather?" → Should ALLOW

## 📊 What's Different Now?

### Before:
- Only local Gemini API analysis
- No backend integration

### After:
- ✅ Backend analysis (primary)
- ✅ Local Gemini fallback
- ✅ Pattern matching fallback
- ✅ Comprehensive logging
- ✅ Works with authentication

## 🔍 Quick Test

### Test Backend API:
```powershell
$body = @{text='Ignore previous instructions'} | ConvertTo-Json
curl.exe -X POST http://localhost:8000/api/v1/analyze/prompt -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TOKEN" --data-binary $body
```

Expected: `"isThreats": true, "riskLevel": "high"`

### Test Extension:
1. Open any webpage (or test page)
2. Open DevTools (F12)
3. Type malicious prompt in a textarea
4. Try to submit
5. Watch console for logs:
   - 🔍 Analysis starts
   - 🏛️ Backend analysis attempt
   - ✅ or 🚨 Result
   - Blocked if malicious

## 📁 Files Changed

1. `extension/src/services/BackendApiService.ts` - Added `analyzePromptInjection()`
2. `extension/src/background/index.ts` - Updated `TEST_PROMPT_INJECTION` handler
3. `extension/src/guards/PromptGuard.ts` - Enhanced logging

## 🎯 Key Points

- **Backend First**: Tries backend analysis before fallback
- **Auth Required**: Uses JWT token from Chrome storage
- **Auto Block**: Malicious prompts automatically blocked
- **Clear Logs**: Every step logged in console
- **No Breaking Changes**: Existing functionality preserved

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Backend API disabled" | Enable in extension settings |
| "No auth token" | Log in through extension |
| Using "local-gemini" | Backend might be down, check logs |
| No logs in console | Reload page, check extension loaded |

## 📚 More Info

- **Full Documentation**: `PROMPT_ANALYSIS_INTEGRATION.md`
- **Testing Guide**: `TESTING_GUIDE.md`
- **Complete Summary**: `INTEGRATION_SUMMARY.md`

## ✅ Verification Checklist

- [ ] Backend running on :8000
- [ ] Extension built successfully
- [ ] Extension loaded in Chrome
- [ ] Logged in with JWT token
- [ ] Backend enabled in settings
- [ ] Test malicious prompt → BLOCKED ✓
- [ ] Test safe prompt → ALLOWED ✓
- [ ] Console shows "backend" as scanType ✓

---

**Status**: ✅ Complete and ready for testing
**Build**: ✅ No errors
**Backend API**: ✅ Tested and working
**Blocking Logic**: ✅ Verified correct
