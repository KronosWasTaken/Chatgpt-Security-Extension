import axios from "axios"

export interface ScanFileRequest {
  fileData: string // base64
  fileName: string
  fileSize: number
  fileType: string
  fileText?: string
  correlationId?: string
  clientId?: string
  mspId?: string
}

export interface ScanFileResponse {
  ok: boolean
  data?: any
  error?: string
}

async function handler(
  req: { body: ScanFileRequest },
  res: { send: (response: ScanFileResponse) => void }
) {
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
          success: true,
          isMalicious: false,
          detectionCount: 0,
          totalEngines: 0,
          threats: [],
          riskLevel: 'safe',
          summary: 'Extension disabled',
          shouldBlock: false
        }
      })
      return
    }

    const headers: Record<string, string> = {}
    
    const authToken = storage.authUser?.token || merged.apiKey
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const correlationId = req.body.correlationId || crypto.randomUUID()
    headers['X-Correlation-ID'] = correlationId

    // Convert base64 to Blob
    const binaryString = atob(req.body.fileData)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: req.body.fileType })
    const file = new File([blob], req.body.fileName, { type: req.body.fileType })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileName', req.body.fileName)
    if (req.body.fileText) {
      formData.append('text', req.body.fileText)
    }
    if (req.body.clientId || merged.clientId) {
      formData.append('clientId', req.body.clientId || merged.clientId)
    }
    if (req.body.mspId || merged.mspId) {
      formData.append('mspId', req.body.mspId || merged.mspId)
    }
    formData.append('correlationId', correlationId)

    const response = await axios.post(
      `${apiUrl}/api/v1/scan/file`,
      formData,
      {
        headers,
        timeout: 30000
      }
    )

    res.send({ ok: true, data: response.data })
  } catch (error: any) {
    console.error('[BACKGROUND] scan-file error:', error)
    const errorMessage = error.response?.data?.message || error.response?.data?.detail || error.message || 'Unknown error'
    res.send({ ok: false, error: errorMessage })
  }
}

export default handler
