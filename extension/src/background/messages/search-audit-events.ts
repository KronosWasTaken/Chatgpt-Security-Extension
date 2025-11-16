import axios from "axios"

export interface SearchAuditEventsRequest {
  limit?: number
  offset?: number
}

export interface SearchAuditEventsResponse {
  ok: boolean
  data?: any
  error?: string
}

async function handler(
  req: { body: SearchAuditEventsRequest },
  res: { send: (response: SearchAuditEventsResponse) => void }
) {
  try {
    const storage = await chrome.storage.sync.get(['backendConfig', 'authUser', 'config'])
    const nested = storage?.config?.backendConfig
    const flat = storage?.backendConfig
    const merged = { ...(nested || {}), ...(flat || {}) }
    
    const apiUrl = merged.apiUrl || 'http://localhost:8000'
    const enabled = merged.enabled !== undefined ? merged.enabled : true
    
    if (!enabled) {
      res.send({ ok: true, data: { logs: [] } })
      return
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
    
    const authToken = storage.authUser?.token || merged.apiKey
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await axios.post(
      `${apiUrl}/api/v1/audit/events/search`,
      {
        limit: req.body.limit ?? 20,
        offset: req.body.offset ?? 0
      },
      { headers, timeout: 30000 }
    )

    res.send({ ok: true, data: response.data })
  } catch (error: any) {
    console.error('[BACKGROUND] search-audit-events error:', error)
    const errorMessage = error.response?.data?.message || error.response?.data?.detail || error.message || 'Unknown error'
    res.send({ ok: false, error: errorMessage })
  }
}

export default handler
