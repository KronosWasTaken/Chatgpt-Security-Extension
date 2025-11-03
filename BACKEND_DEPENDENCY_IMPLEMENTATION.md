# Backend Dependency Implementation

## Overview
Prompts MUST go through backend analysis. If the backend does not respond, prompts are BLOCKED.

## Critical Flow

### 1. Prompt Interception
```
User types in textarea → Click "Send"
↓
PromptGuard.handleClick() intercepts
↓
Extracts text from textarea
↓
Calls checkPromptSafety(text)
```

### 2. Backend Analysis Required
```
checkPromptSafety(text)
↓
Sends to background: TEST_PROMPT_INJECTION
↓
Background sends to backend API
↓
WAITS FOR RESPONSE (30 second timeout)
↓
Backend responds with analysis
↓
Decision: Block or Allow
```

### 3. Blocking Conditions

#### ❌ BACKEND TIMEOUT (> 30 seconds)
```
Reason: "Backend analysis timeout - no response after 30 seconds"
Action: BLOCK prompt
Notification: "Backend timeout. Prompt blocked for security."
```

#### ❌ NETWORK ERROR
```
Reason: Network failure, backend unreachable
Action: BLOCK prompt
Notification: "Unable to reach backend. Prompt blocked for security."
```

#### ❌ AUTHENTICATION REQUIRED
```
Reason: No auth token or invalid token
Action: BLOCK prompt
Notification: "Authentication required. Please log in."
```

#### ❌ BACKEND HTTP ERROR
```
Reason: Backend returns 4xx or 5xx error
Action: BLOCK prompt
Notification: "Backend error. Prompt blocked for security."
```

#### ❌ INVALID RESPONSE
```
Reason: Backend returns empty or invalid JSON
Action: BLOCK prompt
Notification: "Backend returned invalid data. Prompt blocked."
```

#### ❌ THREAT DETECTED
```
Reason: Backend detects prompt injection/threats
Action: BLOCK prompt
Notification: "Security threat detected. Prompt blocked."
```

### 4. Allowing Conditions

#### ✅ VALID SAFE RESPONSE ONLY
```
Condition 1: Backend responds with 200 OK
Condition 2: Valid JSON response
Condition 3: shouldBlock: false AND isThreats: false
Action: ALLOW prompt
```

## Timeout Mechanism

```typescript
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Backend analysis timeout')), 30000)
})

const response = await Promise.race([
  chrome.runtime.sendMessage(...),  // Backend response
  timeoutPromise                     // 30 second timeout
])
```

**Result**: If backend doesn't respond in 30 seconds, prompt is BLOCKED.

## Critical Code Sections

### PromptGuard.ts - checkPromptSafety()
```typescript
try {
  // Set timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Backend analysis timeout')), 30000)
  })
  
  // Wait for backend with timeout
  const response = await Promise.race([
    chrome.runtime.sendMessage({ type: 'TEST_PROMPT_INJECTION', prompt: text }),
    timeoutPromise
  ])
  
  // Check response
  if (!response || !response.success) {
    // BLOCK PROMPT
    return { isSafe: false, ... }
  }
  
  // Process response
  if (response.shouldBlock || response.isThreats) {
    // BLOCK PROMPT
    return { isSafe: false, ... }
  }
  
  // ALLOW PROMPT (only if backend says it's safe)
  return { isSafe: true, ... }
  
} catch (error) {
  // ANY ERROR = BLOCK PROMPT
  return { isSafe: false, backendError: true, ... }
}
```

### Background Script - TEST_PROMPT_INJECTION handler
```typescript
// Step 1: Log prompt
await chrome.runtime.sendMessage({ type: 'ADD_LOG', message: `PROMPT: ${safePrompt}` })

// Step 2: Load config/auth
const storage = await chrome.storage.sync.get(['config', 'authUser'])

// Step 3: Prepare API call
const payload = { text: safePrompt, clientId, mspId }

// Step 4: Call backend
const resp = await fetch(`${apiUrl}/api/v1/analyze/prompt`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  body: JSON.stringify(payload)
})

// Step 5: Handle response
if (resp.status !== 200) {
  sendResponse({ success: false, error: 'Backend failed' })
}

// Step 6: Parse and return
const result = await resp.json()
sendResponse({ success: true, ...result })
```

## Testing

### Test 1: Backend Available
```
1. Type prompt
2. Click send
3. Backend responds in 245ms
4. Result: Allowed/Blocked based on response
```

### Test 2: Backend Unavailable
```
1. Stop backend server
2. Type prompt
3. Click send
4. Wait 30 seconds
5. Result: PROMPT BLOCKED
6. Error: "Backend analysis timeout"
```

### Test 3: Backend Returns Error
```
1. Backend running but returns 401
2. Type prompt
3. Click send
4. Result: PROMPT BLOCKED
5. Error: "Authentication required"
```

### Test 4: No Network
```
1. Disconnect internet
2. Type prompt
3. Click send
4. Result: PROMPT BLOCKED
5. Error: "Network error"
```

## Logging

Every attempt shows:
```
================================================================================
🔍 PromptGuard.checkPromptSafety: ENTRY
================================================================================
   Full text: "Your complete prompt..."

📡 STEP 1: Sending prompt to backend for analysis
   Will wait for backend response...
   
[30 SECOND TIMEOUT RUNNING...]

📥 STEP 2: Received response from backend
   Response success: true
   
📝 STEP 3: Processing backend analysis result
   Threat detected: false
   Should block: false
   
✅ DECISION: Prompt is SAFE - ALLOWING submission
```

OR if backend fails:
```
❌ CRITICAL ERROR: Backend analysis failed
   Error: Network error: Failed to fetch
🚫 BLOCKING PROMPT - No backend response received
   Reason: Backend is required for all prompts
```

## Summary

**No prompt can pass without:**
1. ✅ Backend API call made
2. ✅ Backend responds successfully
3. ✅ Valid JSON returned
4. ✅ shouldBlock: false
5. ✅ isThreats: false

**Any failure at any step = BLOCKED**

