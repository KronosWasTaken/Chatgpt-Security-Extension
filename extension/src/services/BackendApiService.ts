/**
 * Backend API service for Chrome extension integration
 */

import axios from "axios"

interface AnalysisRequest {
  prompt: string
  url?: string
  sessionId?: string
  userAgent?: string
  ipAddress?: string
  browserFingerprint?: string
}

interface AnalysisResponse {
  promptHash: string
  detections: Array<{
    type: string
    patternName: string
    matches: number
    severity: string
    framework: string
    confidence: number
  }>
  riskScore: number
  enforcementAction: string
  confidenceScore: number
  processingTimeMs: number
  analyzedAt: string
}

interface BackendConfig {
  apiUrl: string
  enabled: boolean
  apiKey?: string
  clientId?: string
  mspId?: string
  userId?: string
}

export class BackendApiService {
  private static instance: BackendApiService
  private config: BackendConfig
  
  private constructor() {
    this.config = {
      apiUrl: 'http://localhost:8000',
      enabled: true, 
      // clientId: 'acme-health', 
      // mspId: 'msp-001' 
    }
  }
  
  static getInstance(): BackendApiService {
    if (!BackendApiService.instance) {
      BackendApiService.instance = new BackendApiService()
    }
    return BackendApiService.instance
  }
  
  async initialize(): Promise<void> {
    try {
      // Load configuration from Chrome storage
      const result = await chrome.storage.sync.get(['backendConfig', 'authUser'])
      if (result.backendConfig) {
        this.config = { ...this.config, ...result.backendConfig }
      }
      
      // If we have an authenticated user, use their token
      if (result.authUser && result.authUser.token) {
        this.config.apiKey = result.authUser.token
      }
      
      // Test backend connection
      if (this.config.enabled) {
        await this.testConnection()
      }
    } catch (error) {
      console.warn('Backend API service initialization failed:', error)
    }
  }
  
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing backend connection...')
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: 'GET',
        headers
      })
      console.log('🔍 Health check response:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Backend is reachable:', data)
        return true
      } else {
        console.error('❌ Backend health check failed:', response.status)
        return false
      }
    } catch (error) {
      console.error('❌ Backend connection test failed:', error)
      return false
    }
  }
  
  async analyzePrompt(request: AnalysisRequest): Promise<AnalysisResponse | null> {
    if (!this.config.enabled) {
      console.log('Backend API disabled, skipping analysis')
      return null
    }
    
    try {
      const headers = await this.getAuthHeaders()
      headers['Content-Type'] = 'application/json'
      
      const response = await fetch(`${this.config.apiUrl}/api/v1/analyze/prompt`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...request,
          clientId: this.config.clientId,
          mspId: this.config.mspId
        })
      })
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status} ${response.statusText}`)
      }
      
      const analysisResult = await response.json()
      console.log('✅ Backend analysis completed:', analysisResult)
      
      return analysisResult
    } catch (error) {
      console.error('❌ Backend analysis failed:', error)
      return null
    }
  }
  
  async getApprovedAiServices(): Promise<any[] | null> {
    if (!this.config.enabled) {
      return null
    }
    
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(`${this.config.apiUrl}/api/v1/ai-inventory/`, {
        method: 'GET',
        headers
      })
      
      if (!response.ok) {
        throw new Error(`Failed to get AI services: ${response.status}`)
      }
      
      const data = await response.json()
      // Backend returns an array: [{ clientId, clientName, items: [...] }]
      // Old frontend expected { applications: [...] }. Normalize to a flat array of items.
      if (Array.isArray(data)) {
        const allItems = data.flatMap((entry: any) => (entry?.items || []).map((it: any) => ({
          clientId: entry?.clientId,
          clientName: entry?.clientName,
          ...it
        })))
        return allItems
      }
      return []
    } catch (error) {
      console.error('Failed to get approved AI services:', error)
      return null
    }
  }

  async getAiInventory(): Promise<Array<{ clientId: string; clientName: string; items: any[] }>> {
    if (!this.config.enabled) {
      return []
    }
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${this.config.apiUrl}/api/v1/ai-inventory/`, { method: 'GET', headers })
      if (!response.ok) {
        throw new Error(`Failed to get AI inventory: ${response.status}`)
      }
      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Failed to get AI inventory:', error)
      return []
    }
  }

  async getClientEngagement(clientId: string, params?: { department?: string; target_date?: string }): Promise<any | null> {
    if (!this.config.enabled) {
      return null
    }
    try {
      const headers = await this.getAuthHeaders()
      const qs = new URLSearchParams()
      if (params?.department) qs.set('department', params.department)
      if (params?.target_date) qs.set('target_date', params.target_date)
      const url = `${this.config.apiUrl}/api/v1/ai-engagement/clients/${clientId}${qs.toString() ? `?${qs.toString()}` : ''}`
      const response = await fetch(url, { method: 'GET', headers })
      if (!response.ok) {
        throw new Error(`Failed to get client engagement: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to get client engagement:', error)
      return null
    }
  }
  
  async updateConfig(newConfig: Partial<BackendConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig }
    
    // Save to Chrome storage
    await chrome.storage.sync.set({ backendConfig: this.config })
    
    // Test connection if enabled
    if (this.config.enabled) {
      await this.testConnection()
    }
  }

  async refreshAuthToken(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(['authUser'])
      if (result.authUser && result.authUser.token) {
        this.config.apiKey = result.authUser.token
      }
    } catch (error) {
      console.error('🔐 BackendApiService: Failed to refresh auth token:', error)
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    await this.refreshAuthToken()
    
    const headers: Record<string, string> = {}
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }
    
    return headers
  }

  getConfig(): BackendConfig {
    return { ...this.config }
  }
  
  isEnabled(): boolean {
    return this.config.enabled
  }
  
  async scanFile(file: File, fileText?: string): Promise<any> {
    console.log('🔍 BackendApiService.scanFile called')
    console.log('🔍 Config:', this.config)
    
    try {
      const headers = await this.getAuthHeaders()
      
      const formData = new FormData()
      formData.append('file', file)
      if (fileText) {
        formData.append('text', fileText)
      }

      console.log('🚀 Making request to:', `${this.config.apiUrl}/api/v1/scan/file`)
      console.log('🚀 FormData contents:', {
        file: file.name,
        fileSize: file.size,
        hasText: !!fileText
      })

      console.log('🚀 Request headers (axios):', headers)
      console.log('🚀 About to make axios request...')

      

      const axiosResponse = await axios.post(
        `${this.config.apiUrl}/api/v1/scan/file`,
        formData,
        {
          headers,
          timeout: 30000, 
        }
      )

      console.log('✅ Backend file scan completed (axios):', axiosResponse.data)
      return axiosResponse.data
    } catch (error) {
      console.error('❌ Backend file scan failed:', error)
      console.error('❌ Error type:', typeof error)
      console.error('❌ Error message:', (error as any)?.message)
      console.error('❌ Error stack:', (error as any)?.stack)
      
      // Check if it's an axios error
      if (axios.isAxiosError && axios.isAxiosError(error)) {
        console.error('❌ Axios error details:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        })
      }
      
      // Check if it's a network error
      if ((error as any)?.name === 'TypeError' && (error as any)?.message?.includes('fetch')) {
        console.error('❌ Network error detected - check if backend is running')
      }
      
      return null
    }
  }

  async logAuditEvent(event: {
    type: string
    message: string
    severity: string
    data?: any
  }): Promise<void> {
    if (!this.config.enabled) {
      console.log('Backend API disabled, skipping audit log')
      return
    }
    
    try {
      const headers = await this.getAuthHeaders()
      headers['Content-Type'] = 'application/json'
      
      const response = await fetch(`${this.config.apiUrl}/api/v1/audit/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event_type: event.type,
          event_category: event.type,
          message: event.message,
          severity: event.severity,
          details: event.data || {},
          timestamp: new Date().toISOString(),
          source: 'chrome_extension',
          client_id: this.config.clientId,
          msp_id: this.config.mspId,
          user_id: this.config.userId || null
        })
      })
      
      if (!response.ok) {
        throw new Error(`Audit logging failed: ${response.status} ${response.statusText}`)
      }
      
      console.log('✅ Audit event logged successfully')
    } catch (error) {
      console.error('❌ Failed to log audit event:', error)
    }
  }
}