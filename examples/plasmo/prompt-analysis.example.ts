/**
 * Plasmo browser extension example for calling /api/v1/analyze/prompt
 * 
 * Required manifest permissions:
 * 
 * "permissions": [
 *   "storage",
 *   "alarms"
 * ],
 * "host_permissions": [
 *   "http://localhost:8000/*",
 *   "http://your-backend-domain.com/*"
 * ]
 */

interface PromptAnalysisRequest {
  text: string
}

interface PromptAnalysisResponse {
  isThreats: boolean
  threats: string[]
  riskLevel: "low" | "medium" | "high" | "critical"
  summary: string
  quickPattern: string | null
  dangerousPattern: string | null
  shouldBlock: boolean
  blockReason: string | null
  piiDetection: {
    hasPII: boolean
    types: string[]
    count: number
    riskLevel: string
  }
}

async function analyzePrompt(text: string): Promise<PromptAnalysisResponse | null> {
  const BACKEND_URL = 'http://localhost:8000'
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/analyze/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text
      })
    })

    if (!response.ok) {
      console.error(`Analysis failed: ${response.status} ${response.statusText}`)
      return null
    }

    const data: PromptAnalysisResponse = await response.json()
    return data
  } catch (error) {
    console.error('Failed to analyze prompt:', error)
    return null
  }
}

// Usage example in content script or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_PROMPT') {
    analyzePrompt(message.text).then(result => {
      sendResponse({ ok: true, result })
    }).catch(error => {
      sendResponse({ ok: false, error: error.message })
    })
    return true // Keep channel open for async response
  }
})

// Content script usage
export { analyzePrompt }

/**
 * Common CORS gotchas for extensions:
 * 
 * 1. Origin header: Browser extensions don't have traditional origins.
 *    Use "chrome-extension://YOUR_EXTENSION_ID" in host_permissions
 * 
 * 2. Preflight requests: Browsers send OPTIONS before POST if:
 *    - Custom headers (Content-Type: application/json triggers this)
 *    - Custom methods
 * 
 * 3. CORS errors in console: Check that backend returns:
 *    - Access-Control-Allow-Origin header
 *    - Access-Control-Allow-Methods: POST, OPTIONS
 *    - Access-Control-Allow-Headers: Content-Type
 * 
 * 4. Localhost development: Ensure backend allows your local ports:
 *    http://localhost:3000, http://localhost:5173, etc.
 * 
 * 5. Credentials: If using cookies/auth tokens, add:
 *    credentials: 'include' to fetch options
 */

