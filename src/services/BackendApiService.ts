/**
 * Backend API service for Chrome extension integration
 */

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
}

export class BackendApiService {
  private static instance: BackendApiService
  private config: BackendConfig
  
  private constructor() {
    this.config = {
      apiUrl: 'http://localhost:8000',
      enabled: false,
      clientId: 'acme-health', // Default client for demo
      mspId: 'msp-001' // Default MSP for demo
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
      const result = await chrome.storage.sync.get(['backendConfig'])
      if (result.backendConfig) {
        this.config = { ...this.config, ...result.backendConfig }
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
      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ Backend connection successful:', data)
      return true
    } catch (error) {
      console.warn('❌ Backend connection failed:', error)
      return false
    }
  }
  
  async analyzePrompt(request: AnalysisRequest): Promise<AnalysisResponse | null> {
    if (!this.config.enabled) {
      console.log('Backend API disabled, skipping analysis')
      return null
    }
    
    try {
      const response = await fetch(`${this.config.apiUrl}/api/v1/analyze/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
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
      const response = await fetch(`${this.config.apiUrl}/api/v1/ai-inventory/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to get AI services: ${response.status}`)
      }
      
      const data = await response.json()
      return data.applications || []
    } catch (error) {
      console.error('Failed to get approved AI services:', error)
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
  
  getConfig(): BackendConfig {
    return { ...this.config }
  }
  
  isEnabled(): boolean {
    return this.config.enabled
  }
  
  async logAuditEvent(event: {
    type: string
    message: string
    severity: string
    data?: any
  }): Promise<void> {
    if (!this.config.enabled) {
      return
    }
    
    try {
      await fetch(`${this.config.apiUrl}/api/v1/audit/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          eventType: event.type,
          message: event.message,
          severity: event.severity,
          metadata: event.data,
          timestamp: new Date().toISOString(),
          source: 'chrome_extension',
          clientId: this.config.clientId,
          mspId: this.config.mspId
        })
      })
    } catch (error) {
      console.warn('Failed to log audit event:', error)
    }
  }
}