import axios from "axios"

type Req = { prompt: string; correlationId?: string; clientId?: string; mspId?: string }
type Res = { ok: boolean; data?: any; error?: string }

async function handler(req: { body: Req }, res: { send: (response: Res) => void }) {
  console.log('[BG] analyze-prompt handler called')

  try {
    const storage = await chrome.storage.sync.get(['backendConfig', 'authUser', 'config'])
    
    const nested = storage?.config?.backendConfig
    const flat = storage?.backendConfig
    const merged = { ...(nested || {}), ...(flat || {}) }
    
    const apiUrl = merged.apiUrl || 'http://localhost:8000'
    const enabled = merged.enabled !== undefined ? merged.enabled : true
    
    if (!enabled) {
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    const authToken = storage.authUser?.token || merged.apiKey
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const payload = {
      text: req.body.prompt,
      clientId: req.body.clientId || merged.clientId,
      mspId: req.body.mspId || merged.mspId,
      correlationId: req.body.correlationId
    }

    console.log('[BG] POST', `${apiUrl}/api/v1/analyze/prompt`)

    const response = await axios.post(
      `${apiUrl}/api/v1/analyze/prompt`,
      payload,
      { headers, timeout: 30000 }
    )

    console.log('[BG] response OK')

    res.send({
      ok: true,
      data: response.data
    })

  } catch (error: any) {
    console.error('[BG] error:', error)
    
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
