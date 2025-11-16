import axios from "axios"

export interface AnalyzePromptRequest {
  prompt: string
  correlationId?: string
  clientId?: string
  mspId?: string
}

export interface AnalyzePromptResponse {
  ok: boolean
  data?: {
    isThreats: boolean
    threats: string[]
    riskLevel: string
    summary: string
    quickPattern?: string
    dangerousPattern?: string
    shouldBlock?: boolean
    blockReason?: string
    piiDetection?: {
      hasPII: boolean
      types?: string[]
      count?: number
      riskLevel?: string
    } | null
    correlationId?: string
  }
  error?: string
}

// Plasmo background message handler
// This handler is automatically registered by Plasmo
async function handler(req: { body: AnalyzePromptRequest }, res: { send: (response: AnalyzePromptResponse) => void }) {
  console.log('[BACKGROUND] analyze-prompt handler called', {
    prompt: req.body?.prompt?.substring(0, 50),
    correlationId: req.body?.correlationId
  })

  try {
    // Get backend configuration from storage
    const storage = await chrome.storage.sync.get(['backendConfig', 'authUser', 'config'])
    
    // Merge config sources
    const nested = storage?.config?.backendConfig
    const flat = storage?.backendConfig
    const merged = { ...(nested || {}), ...(flat || {}) }
    
    const apiUrl = merged.apiUrl || 'http://localhost:8000'
    const enabled = merged.enabled !== undefined ? merged.enabled : true
    
    // Check if extension is enabled
    if (!enabled) {
      console.log('[BACKGROUND] Backend API disabled, allowing')
      res.send({
        ok: true,
        data: {
          isThreats: false,
          threats: [],
          riskLevel: 'safe',
          summary: 'Extension disabled',
          shouldBlock: false,
          piiDetection: null
        }
      })
      return
    }

    // Prepare auth headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    // Add JWT token if available
    const authToken = storage.authUser?.token || merged.apiKey
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    // Prepare request payload
    const payload = {
      text: req.body.prompt,
      clientId: req.body.clientId || merged.clientId,
      mspId: req.body.mspId || merged.mspId,
      correlationId: req.body.correlationId
    }

    console.log('[BACKGROUND] Making request to backend', {
      url: `${apiUrl}/api/v1/analyze/prompt`,
      hasAuth: !!authToken
    })

    // Make request to backend API from background context
    const response = await axios.post(
      `${apiUrl}/api/v1/analyze/prompt`,
      payload,
      {
        headers,
        timeout: 30000
      }
    )

    console.log('[BACKGROUND] Backend response received', {
      status: response.status,
      data: response.data
    })

    // Send success response
    res.send({
      ok: true,
      data: response.data
    })

  } catch (error: any) {
    console.error('[BACKGROUND] analyze-prompt error:', error)
    
    // Extract error message
    const errorMessage = error.response?.data?.message 
      || error.response?.data?.detail 
      || error.message 
      || 'Unknown error'

    res.send({
      ok: false,
      error: errorMessage
    })
  }
}

export default handler
