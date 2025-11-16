# Debug Prompt Flow - Text Passing Verification

## Complete Flow with Text Verification

### Step 1: User Action
```
User types in textarea
↓
User clicks "Send" button
↓
PromptGuard.handleClick() intercepts
```

### Step 2: Text Extraction (NEW LOGGING)
```
 ElementSelector.getFirstTextWithContent: Starting text extraction
   Trying selectors: ['textarea', 'textarea[name="prompt-textarea"]', ...]
   Trying selector: textarea
   Found element: <textarea...>
   Element text content: "Your prompt text"
   Extracted text: "Your prompt text"
   Text length: 50
 Found text: "Your prompt text"
```

### Step 3: Text Verification (NEW LOGGING)
```
 PromptGuard.handleClick: Text extraction result:
   hasData: true
   hasText: true
   textLength: 50
   fullText: "Your prompt text"
 Text found and valid
   Full text will be sent to backend: "Your prompt text"
```

### Step 4: Call Safety Check (NEW LOGGING)
```
 PromptGuard.handleClick: Calling checkPromptSafety with:
   Prompt text: "Your prompt text"
   Prompt length: 50 characters
   Prompt type: string
```

### Step 5: checkPromptSafety Receives (ALREADY LOGGED)
```
================================================================================
 PromptGuard.checkPromptSafety: ENTRY
================================================================================
   Text length: 50
   Text preview: "Your prompt text"
   Full text: "Your prompt text"
   Will send to backend: "Your prompt text"
```

### Step 6: Background Script Receives (ALREADY LOGGED)
```
 REQUEST DETAILS:
   Prompt received: true
   FULL PROMPT: "Your prompt text"
   Full prompt length: 50
```

### Step 7: Backend API Call (ALREADY LOGGED)
```
 PAYLOAD BEING SENT TO BACKEND:
{
  "text": "Your prompt text",
  "clientId": "...",
  "mspId": null
}

 PAYLOAD VERIFICATION:
   Prompt text in payload: "Your prompt text"
   Full prompt being sent to backend: "Your prompt text"
```

## What to Check if Text is Missing

### Check 1: ElementSelector not finding text?
```
Open DevTools
Type in console:
ElementSelector.getFirstTextWithContent()

Should see: { element: ..., text: "..." }
```

### Check 2: Is PromptGuard intercepting?
```
Look for: " PromptGuard: Detected send button click"
```

### Check 3: Is text being extracted?
```
Look for: " Found text: ..."
```

### Check 4: Is it reaching checkPromptSafety?
```
Look for: " PromptGuard.checkPromptSafety: ENTRY"
```

### Check 5: Is it reaching background?
```
Look for: " REQUEST DETAILS:"
```

### Check 6: Is it hitting backend?
```
Look for: " SENDING FETCH REQUEST TO BACKEND..."
Look for: " BACKEND RESPONSE RECEIVED"
```

## Common Issues

### Issue 1: Selector Not Matching
**Symptom**: " No text found in any selectors"
**Fix**: ElementSelector will try fallback (all textareas)

### Issue 2: Empty Textarea
**Symptom**: Text length = 0
**Fix**: User needs to type something

### Issue 3: Text Too Short
**Symptom**: "Text too short: X" (length < 5)
**Fix**: This is expected for short text

### Issue 4: Not Intercepting
**Symptom**: No logs at all
**Fix**: Check content script is loaded, extension is active

## New Enhanced Logging

Now you'll see:
1.  Every selector tried
2.  Every element found
3.  Text content vs value
4.  Exact text extracted
5.  Fallback search if needed
6.  Full text verification before sending
7.  Full text in payload
8.  Full text sent to backend

## Testing

1. Rebuild: `cd extension && npm run build`
2. Reload extension
3. Open test page
4. Open DevTools (F12)
5. Type: "This is my test prompt"
6. Click send
7. Watch logs show every step with full text

