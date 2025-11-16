import type { PlasmoContentScript } from "plasmo"
import { PromptGuard } from "../guards/PromptGuard"
import { NotificationManager } from "../ui/NotificationManager"

export const config: PlasmoContentScript = {
 matches: [
    "https://chatgpt.com/*", 
"https://gemini.google.com/*", 
"https://claude.ai/*",
    "https://chat.openai.com/*", 
    "http://127.0.0.1:*/*", 
    "http://localhost:*/*", 
   
  ],
  all_frames: true,
  run_at: "document_idle"
}

// Ensure single instance per page
;(async () => {
  console.log('')
  console.log('  [PROMPT-GUARD] Content Script Starting...                         ')
  console.log('')
  console.log('   Page URL:', window.location.href)
  console.log('   Document ready:', document.readyState)
  console.log('   Body exists:', !!document.body)
  
  try {
    if ((window as any).__promptGuardInstance) {
      console.log('[PROMPT-GUARD] Already initialized, skipping')
      return
    }

    console.log('[PROMPT-GUARD] Creating new PromptGuard instance...')
    
    // Initialize guard and hook notifications to UI manager
    const guard = new PromptGuard()
    const notification = new NotificationManager()
    
    // Bridge guard notifications to UI
    ;(guard as any)["showNotification"] = (message: string, type: any) => {
      notification.show(message, type)
    }

    ;(window as any).__promptGuardInstance = guard
    console.log('[PROMPT-GUARD]  Instance created and registered as window.__promptGuardInstance')

    // Send initialization log to extension
    try {
      await chrome.runtime.sendMessage({
        type: "ADD_LOG",
        message: " PromptGuard content script active and monitoring prompts",
        logType: "info",
        category: "system"
      })
      console.log('[PROMPT-GUARD]  Logged to extension storage')
    } catch (error) {
      console.error('[PROMPT-GUARD]  Failed to log to extension:', error)
    }

    console.log('[PROMPT-GUARD]  Initialization complete - ready to intercept prompts')
    console.log('   Test: Type in any textarea and try to send')
    
    // Add a visual indicator on the page
    const indicator = document.createElement('div')
    indicator.id = 'promptguard-indicator'
    indicator.style.cssText = 'position:fixed;top:50px;right:10px;background:green;color:white;padding:5px 10px;border-radius:5px;z-index:999999;font-size:12px;'
    indicator.textContent = '🛡️'
    document.body.appendChild(indicator)
    console.log('[PROMPT-GUARD] Added visual indicator to page')
    
  } catch (e) {
    console.error("[PROMPT-GUARD]  CRITICAL: Failed to init PromptGuard content script:", e)
    console.error('   Error details:', {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : 'no stack'
    })
  }
})()
