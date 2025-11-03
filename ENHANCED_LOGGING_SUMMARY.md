# Enhanced Prompt Logging Summary

## What Was Changed

### 1. Prominent Console Logging Throughout

#### PromptGuard.ts - Constructor and Event Handlers
```typescript
constructor() {
  console.log('🔍 PromptGuard: Constructor called')
  // ...
  console.log('✅ PromptGuard: Initialized')
}

setupEventHandlers() {
  console.log('🔍 PromptGuard.setupEventHandlers: Setting up event handlers')
  // Added direct debug listeners for clicks and keyboard
  // ...
  console.log('✅ PromptGuard.setupEventHandlers: Event handlers registered')
}
```

#### PromptGuard.ts - Click Handler with Full Logging
```typescript
async handleClick(event: Event) {
  console.log('🔍 PromptGuard.handleClick: Event intercepted')
  console.log('🔍 PromptGuard.handleClick: Target element:', target.tagName)
  console.log('✅ PromptGuard.handleClick: Send button detected!')
  // Every single decision point is logged
}
```

#### Content Script - Initialization Logging
```typescript
console.log('[PROMPT-GUARD] Content script starting...')
console.log('[PROMPT-GUARD] Creating new instance...')
console.log('[PROMPT-GUARD] Instance created and registered')
console.log('[PROMPT-GUARD] Initialization complete')
```

### 2. Direct Event Listeners for Debugging

Added listeners that log **every** click and keyboard event, even before they reach the handler:

```typescript
// Logs EVERY click on ANY element
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  if (ElementSelector.isSendButton(target)) {
    console.log('🔍 PromptGuard: Detected send button click on:', target)
  }
}, true)

// Logs EVERY keyboard event
document.addEventListener('keydown', (e) => {
  const isSendShortcut = (
    (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ||
    (e.key === 'Enter' && e.target && (e.target as HTMLElement).tagName === 'TEXTAREA')
  )
  if (isSendShortcut) {
    console.log('🔍 PromptGuard: Detected keyboard send shortcut:', e.key)
  }
}, true)
```

### 3. Enhanced checkPromptSafety Logging

Every step of prompt analysis is logged with timestamps and details:

```typescript
console.log('🔍 PromptGuard.checkPromptSafety: ENTRY - text length:', text?.length)
console.log('🔍 PromptGuard.checkPromptSafety: Analyzing prompt (preview):', preview)
console.log('📡 PromptGuard.checkPromptSafety: Sending to background script...')
console.log('📥 PromptGuard.checkPromptSafety: Received response from background script:', response)
```

## How to See the Logs

### 1. Open Chrome DevTools (F12)
### 2. Go to Console Tab
### 3. You will see:

#### On Page Load:
```
[PROMPT-GUARD] Content script starting...
[PROMPT-GUARD] Creating new instance...
🔍 PromptGuard: Constructor called
🔍 PromptGuard.setupEventHandlers: Setting up event handlers
✅ PromptGuard.setupEventHandlers: Event handlers registered
✅ PromptGuard: Initialized
[PROMPT-GUARD] Instance created and registered
[PROMPT-GUARD] Logged to extension storage
[PROMPT-GUARD] Initialization complete
```

#### When Clicking Send Button:
```
🔍 PromptGuard: Detected send button click on: <button>
🔍 PromptGuard.handleClick: Event intercepted
🔍 PromptGuard.handleClick: Target element: BUTTON button-submit
✅ PromptGuard.handleClick: Send button detected!
🔍 PromptGuard.handleClick: Text data: "Your prompt text here..."
🚨 PromptGuard.handleClick: Calling checkPromptSafety with: "Your prompt..."
🔍 PromptGuard.checkPromptSafety: ENTRY - text length: 45
🔍 PromptGuard.checkPromptSafety: Analyzing prompt...
📡 PromptGuard.checkPromptSafety: Sending to background script...
📥 TEST_PROMPT_INJECTION received: {promptReceived: true, ...}
📝 TEST_PROMPT_INJECTION: Step 1 - Logging captured prompt...
✅ TEST_PROMPT_INJECTION: Prompt logged to extension storage
📝 TEST_PROMPT_INJECTION: Step 2 - Loading config and auth...
📝 TEST_PROMPT_INJECTION: Step 3 - Config loaded: {apiUrl: ..., hasAuth: true}
📡 TEST_PROMPT_INJECTION: Sending fetch request...
✅ TEST_PROMPT_INJECTION: Fetch completed in 245ms
   Status: 200 OK
📥 PromptGuard.checkPromptSafety: Received response from background script
✅ PromptGuard.handleClick: Safety check result: true/false
```

## Testing Steps

### Step 1: Rebuild Extension
```bash
cd extension
npm run build
```

### Step 2: Reload Extension
1. Go to `chrome://extensions/`
2. Find your extension
3. Click the reload button 🔄

### Step 3: Open Test Page
```
file:///C:/Users/snoorabbits/OneDrive/Videos/tryapi/Chatgpt-Security-Extension/test-prompt-flow.html
```

### Step 4: Open DevTools (F12)

### Step 5: Type and Send a Prompt
- Watch the console - you'll see EVERY step

### Step 6: Verify Backend Call
Look for these specific logs:
```
📡 TEST_PROMPT_INJECTION: Sending fetch request...
✅ TEST_PROMPT_INJECTION: Fetch completed in XXXms
```

## Common Issues & Solutions

### Issue: No logs appearing in console

**Check:**
1. Is the extension loaded? `chrome://extensions/`
2. Did you reload the page after extension reload?
3. Is the content script matching the page URL?
4. Check: `console.log(window.__promptGuardInstance)` - should show the instance

**Solution:**
```javascript
// In console, manually check:
console.log('PromptGuard exists:', window.__promptGuardInstance)
console.log('Content script active:', document.querySelector('textarea'))
```

### Issue: Logs show "Not a send button"

**Check:**
1. What element are you clicking on?
2. Run: `ElementSelector.isSendButton(targetElement)` in console

**Solution:**
The selector might not match your button. Check the button's attributes:
```javascript
const btn = document.querySelector('button') // or whatever button
console.log('Button attributes:', {
  dataTestId: btn.getAttribute('data-testid'),
  ariaLabel: btn.getAttribute('aria-label'),
  className: btn.className,
  tagName: btn.tagName
})
```

### Issue: checkPromptSafety not being called

**Check:**
1. Is textData being found?
2. Is text.length > 5?

**Solution:**
The text might be too short or in a different element. Check ElementSelector logic.

## What to Look For

### ✅ Good Signs:
- `[PROMPT-GUARD] Content script starting...` appears
- `🔍 PromptGuard: Detected send button click` when clicking
- `🚨 PromptGuard.handleClick: Calling checkPromptSafety` appears
- `📡 TEST_PROMPT_INJECTION: Sending fetch request...` appears
- `✅ TEST_PROMPT_INJECTION: Fetch completed` with 200 status

### ❌ Bad Signs:
- No `[PROMPT-GUARD]` logs = content script not loading
- No `🔍 PromptGuard: Detected send button click` = event listeners not working
- No `🚨 PromptGuard.handleClick: Calling checkPromptSafety` = handler not being called
- No `📡 TEST_PROMPT_INJECTION: Sending fetch request...` = not reaching background script

## Summary

Every single interaction is now logged:
1. ✅ Content script loading
2. ✅ PromptGuard instantiation
3. ✅ Event handler setup
4. ✅ Click/keyboard detection
5. ✅ Send button identification
6. ✅ Text extraction
7. ✅ Safety check call
8. ✅ Background message
9. ✅ Backend API call
10. ✅ Response handling

If you don't see logs at ANY step, you'll know exactly where the flow breaks!

