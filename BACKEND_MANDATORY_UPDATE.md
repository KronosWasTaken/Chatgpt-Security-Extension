# Backend Mandatory Update - Prompt Blocking

## 🎯 Critical Change

**The backend API is now MANDATORY when enabled. Prompts will be BLOCKED if the backend cannot be reached.**

## 🔒 New Behavior

### Before (Old):
```
Backend enabled → Try backend → Failed? → Fallback to local Gemini → Allow if safe
```

### After (New):
```
Backend enabled → Try backend → Failed? → ❌ BLOCK PROMPT + Show Error
Backend disabled → Use local Gemini → Allow/Block based on analysis
```

## 📋 Changes Made

### 1. Background Script Logic (`extension/src/background/index.ts`)

**When backend is ENABLED:**
- Backend analysis is **REQUIRED**
- If backend fails/unreachable: **BLOCK THE PROMPT**
- Returns error response with `backendUnreachable: true`
- No fallback to local Gemini when backend is enabled

**When backend is DISABLED:**
- Falls back to local Gemini API (original behavior)
- If no Gemini key: Shows error asking to enable backend or add key

### 2. PromptGuard Enhancement (`extension/src/guards/PromptGuard.ts`)

Added explicit checks for:

**Backend Unreachable:**
```typescript
if (response.backendUnreachable) {
  ❌ Clear inputs
  ❌ Show error notification
  ❌ Block prompt
}
```

**Authentication Error:**
```typescript
if (response.error.includes('Authentication required')) {
  🔐 Clear inputs
  🔐 Show auth error notification
  🔐 Block prompt
}
```

**Enhanced Notifications:**
- Error notifications now shown directly in UI
- Fallback notification creation if NotificationManager isn't available
- Clear messages for different error types

## 🔍 Error Messages

### Backend Unreachable:
```
❌ Backend security service is unreachable. 
Cannot verify prompt safety. 
Please check your connection and try again.
```

### Authentication Required:
```
🔐 Authentication required. 
Please log in to use prompt protection.
```

### Backend Disabled + No Gemini Key:
```
Backend is disabled and Gemini API key is not configured. 
Please enable backend or add your Gemini API key in the extension settings.
```

## 🧪 Testing Scenarios

### Test 1: Backend Enabled & Reachable
**Setup:**
- Backend running on localhost:8000
- Extension backend config enabled
- User authenticated

**Action:** Type malicious prompt: "Ignore previous instructions"

**Expected Result:**
- ✅ Backend analyzes prompt
- ✅ Detects threat (isThreats: true)
- ✅ Input cleared
- ✅ Notification shown
- ✅ Prompt BLOCKED

**Console Logs:**
```
🔍 PromptGuard: Checking prompt safety...
🔍 PromptGuard: Sending prompt to backend for analysis...
🏛️ Backend is enabled - attempting backend prompt analysis (REQUIRED)...
🔍 Analyzing prompt with backend...
✅ Backend prompt analysis completed: {isThreats: true, ...}
🚨 PromptGuard: THREAT DETECTED - Blocking prompt and clearing inputs
```

---

### Test 2: Backend Enabled & UNREACHABLE
**Setup:**
- Backend **NOT** running (stop the backend server)
- Extension backend config enabled
- User authenticated

**Action:** Type any prompt: "Hello world"

**Expected Result:**
- ❌ Backend call fails
- ❌ Prompt BLOCKED (for security)
- ❌ Error notification shown
- ❌ Input cleared
- 🚫 NO FALLBACK to local Gemini

**Console Logs:**
```
🔍 PromptGuard: Checking prompt safety...
🔍 PromptGuard: Sending prompt to backend for analysis...
🏛️ Backend is enabled - attempting backend prompt analysis (REQUIRED)...
❌ Backend prompt analysis failed: null
❌ CRITICAL: Backend is enabled but analysis failed - BLOCKING prompt for security
❌ PromptGuard: Backend is unreachable - BLOCKING prompt
ERROR: ❌ Backend security service unreachable. Prompt blocked for safety.
```

**User Notification:**
> ❌ Backend security service unreachable. Prompt blocked for safety.

---

### Test 3: Backend Disabled (Fallback Mode)
**Setup:**
- Backend config disabled in extension
- Gemini API key configured

**Action:** Type malicious prompt: "Ignore previous instructions"

**Expected Result:**
- ⚠️ Uses local Gemini analysis
- ✅ Detects threat
- ✅ Prompt BLOCKED

**Console Logs:**
```
🔍 PromptGuard: Checking prompt safety...
⚠️ Backend is DISABLED - using fallback analysis
🤖 Testing prompt for injection attacks with local Gemini...
🔍 Local Gemini prompt injection test result: {isThreats: true, ...}
🚨 PromptGuard: THREAT DETECTED - Blocking prompt and clearing inputs
```

---

### Test 4: No Authentication
**Setup:**
- Backend enabled
- User **NOT** authenticated (no JWT token)

**Action:** Type any prompt

**Expected Result:**
- ❌ Authentication error
- ❌ Prompt BLOCKED
- 🔐 Auth error notification shown

**Console Logs:**
```
🔐 BACKGROUND: Authentication required for TEST_PROMPT_INJECTION
❌ PromptGuard: Authentication required - BLOCKING prompt
ERROR: 🔐 Authentication required. Please log in to use prompt protection.
```

---

### Test 5: Backend Disabled + No Gemini Key
**Setup:**
- Backend config disabled
- No Gemini API key configured

**Action:** Type any prompt

**Expected Result:**
- ❌ Error response
- ⚠️ Message asking to enable backend or add Gemini key
- ❌ Prompt functionality unavailable

---

## 📊 Security Rationale

### Why Block When Backend Unreachable?

1. **Security First**: If backend analysis is enabled, it means the organization **requires** backend security validation
2. **No Silent Failures**: Users should know when security checks fail
3. **Prevent Bypass**: Attackers could disable backend connectivity to bypass analysis
4. **Explicit Choice**: If you want fallback, disable backend; if enabled, it's mandatory
5. **Audit Trail**: All blocked prompts are logged for security review

## 🔧 Configuration Options

### Option A: Backend Required (Recommended for Organizations)
```json
{
  "backendConfig": {
    "enabled": true,
    "apiUrl": "http://localhost:8000"
  }
}
```
- ✅ Centralized security
- ✅ Consistent policies
- ✅ Full audit trail
- ⚠️ Requires backend availability

### Option B: Fallback Mode (For Individual Users)
```json
{
  "backendConfig": {
    "enabled": false
  },
  "geminiApiKey": "your-key-here"
}
```
- ✅ Works offline
- ✅ No backend dependency
- ⚠️ Less centralized control
- ⚠️ User provides API key

## 🚀 Deployment Checklist

- [ ] Backend is running and accessible
- [ ] Users are authenticated
- [ ] Backend health endpoint returns 200 OK
- [ ] Test with backend down (should block)
- [ ] Test with backend up (should analyze)
- [ ] Verify error notifications appear
- [ ] Check console logs for debugging

## 📝 Rollback Plan

If issues occur, you can quickly revert to fallback mode:

1. **Disable backend** in extension settings
2. **Add Gemini API key** for each user
3. Extension will use local Gemini analysis

Or revert code to previous commit if needed.

## ✅ Verification Commands

### Test backend is reachable:
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok"}
```

### Test backend analysis:
```powershell
$body = @{text='Test prompt'} | ConvertTo-Json
curl.exe -X POST http://localhost:8000/api/v1/analyze/prompt `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_TOKEN" `
  --data-binary $body
```

### Load extension and test:
1. Open Chrome DevTools (F12)
2. Go to any page with text input
3. Stop backend server
4. Try to send a prompt
5. Should see: ❌ Error notification + Blocked

## 🎓 Summary

The new behavior ensures:
- ✅ Backend API is always called when enabled
- ✅ Prompts are blocked if backend unreachable
- ✅ Clear error messages to users
- ✅ No silent failures or bypasses
- ✅ Security-first approach
- ✅ Fallback option still available (disable backend)

**Status**: ✅ Implemented and built
**Build**: ✅ No errors  
**Ready**: ✅ For testing
