# Complete Prompt Logging Setup

## What Was Added

### 1. Visual Indicator on Page
A green indicator appears in the top-right corner showing " PromptGuard Active" when the content script loads.

### 2. Enhanced Console Logging

#### Content Script Loading
```

  [PROMPT-GUARD] Content Script Starting...                         

   Page URL: http://localhost/test-page.html
   Document ready: complete
   Body exists: true
```

#### PromptGuard Initialization
```

  PromptGuard Constructor Called                                    

   Initializing BackendApiService...
    BackendApiService instance created
   Setting up event handlers...
    Event handlers set up
   Initializing protection...
    Protection initialized
 PromptGuard: Fully initialized and ready to intercept prompts
```

#### Debug Logging for EVERY Click and Keyboard
```
 [DEBUG] Click detected on element: BUTTON button-submit
 [DEBUG] Send button detected: <button>
 [DEBUG] Keydown detected: Enter on TEXTAREA
 [DEBUG] Send shortcut detected: Enter
```

#### Text Extraction
```
 ElementSelector.getFirstTextWithContent: Starting text extraction
   Trying selectors: [...]
   Trying selector: textarea
   Found element: <textarea>
   Element text content: null
   Element value: "Your prompt text"
   Extracted text: "Your prompt text"
   Text length: 50
 Found text: "Your prompt text" ...
```

#### Backend Analysis
```
 STEP 1: Using BackendApiService to analyze prompt
   Prompt text: "Your prompt text"
   Initializing BackendApiService...
   BackendApiService initialized
   Backend enabled: true
   Backend config: {...}
   Calling analyzePromptInjection...
   Backend response received: {...}
```

## How to Test

### 1. Reload Extension
```
1. Go to chrome://extensions/
2. Find your extension
3. Click the reload icon
```

### 2. Open Test Page
```
Open: test-text-extraction-verification.html
OR
Open: test-prompt-flow.html
```

### 3. Open DevTools
```
Press F12
Go to Console tab
```

### 4. Look for Initialization
```
You should see:

  [PROMPT-GUARD] Content Script Starting...                         


And a green " PromptGuard Active" indicator on the page
```

### 5. Type and Send
```
1. Type in the textarea: "This is my test prompt"
2. Watch the console for:
    [DEBUG] Keydown detected: Enter on TEXTAREA
    [DEBUG] Send shortcut detected: Enter
   
3. Click the Send button
4. Watch for:
    PromptGuard.handleClick: Event intercepted
    ElementSelector.getFirstTextWithContent: Starting text extraction
    Found text: "This is my test prompt"
    STEP 1: Using BackendApiService to analyze prompt
```

### 6. Verify Backend Hit
```
Look for:
 STEP 1: Using BackendApiService to analyze prompt
   Backend enabled: true
   Backend config: {...}
   Calling analyzePromptInjection...
   
In Network tab (F12 → Network):
POST http://localhost:8000/api/v1/analyze/prompt
Status: 200 OK
Request payload: {"text": "This is my test prompt", ...}
```

## Extension Logs

### View in Extension Panel
```
1. Click extension icon
2. Go to Logs tab
3. You should see:
    PromptGuard content script active and monitoring prompts
   PROMPT CAPTURED (length=25):
   "This is my test prompt"
   CALLING BACKEND API: POST http://localhost:8000/api/v1/analyze/prompt
   BACKEND RESPONSE RECEIVED (245ms):
   Status: 200 OK
```

## Manual Test in Console

You can manually test the instance:

```javascript
// In browser console (F12)
// Check if instance exists
console.log(window.__promptGuardInstance)

// Test prompt analysis manually
window.__promptGuardInstance.checkPromptSafety("This is a test prompt")

// You'll see all the logs in console
```

## What to Check if Not Working

### Issue 1: No initialization logs
**Check**: Content script not loading
**Fix**: 
1. Check chrome://extensions/ - is extension loaded?
2. Reload the page
3. Check if URL matches content script matches

### Issue 2: No click logs
**Check**: Event listeners not attached
**Fix**: 
1. Check for [DEBUG] logs in console
2. Try clicking ANY element - should see logs

### Issue 3: No text extraction
**Check**: No text in textarea
**Fix**: 
1. Type something in textarea first
2. Check ElementSelector logs
3. Check if textarea exists: `document.querySelectorAll('textarea')`

### Issue 4: No backend hit
**Check**: Backend not called
**Fix**:
1. Check BackendApiService logs
2. Check auth token: `chrome.storage.sync.get(['authUser'])`
3. Check Network tab for API call

## Summary

 Visual indicator shows when content script loads
 EVERY click and keyboard event is logged
 Text extraction is logged with full text
 Backend API call is logged with full payload
 Backend response is logged with full result
 Extension storage logs show everything

**Every single prompt is now completely traceable from start to finish!**

