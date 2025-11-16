import axios from "axios"

export interface LogAuditEventRequest {
  type: string
  message: string
  severity: string
  data?: any
  correlationId?: string
  clientId?: string
  mspId?: string
  userId?: string
}

export interface LogAuditEventResponse {
  ok: boolean
  error?: string
}

async function handler(
  req: { body: LogAuditEventRequest },
  res: { send: (response: LogAuditEventResponse) => void }
) {
  try {
    const storage = await chrome.storage.sync.get(['backendConfig', 'authUser', 'config'])
    const nested = storage?.config?.backendConfig
    const flat = storage?.backendConfig
    const merged = { ...(nested || {}), ...(flat || {}) }
    
    const apiUrl = merged.apiUrl || 'http://localhost:8000'
    const enabled = merged.enabled !== undefined ? merged.enabled : true
    
    if (!enabled) {
      res.send({ ok: true })
      return
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    const authToken = storage.authUser?.token || merged.apiKey
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const correlationId = req.body.correlationId || req.body.data?.correlationId || crypto.randomUUID()

    await axios.post(
      `${apiUrl}/api/v1/audit/events`,
      {
        event_type: req.body.type,
        event_category: req.body.type,
        message: req.body.message,
        severity: req.body.severity,
        details: { ...(req.body.data || {}), correlationId },
        timestamp: new Date().toISOString(),
        source: 'chrome_extension',
        client_id: req.body.clientId || merged.clientId,
        msp_id: req.body.mspId || merged.mspId,
        user_id: req.body.userId || null,
        correlation_id: correlationId
      },
      { headers, timeout: 30000 }
    )

    res.send({ ok: true })
  } catch (error: any) {
    console.error('[BACKGROUND] log-audit-event error:', error)
    const errorMessage = error.response?.data?.message || error.response?.data?.detail || error.message || 'Unknown error'
    res.send({ ok: false, error: errorMessage })
  }
}

export default handler
