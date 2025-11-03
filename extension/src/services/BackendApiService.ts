/**
 * Backend API service for Chrome extension integration
 */

import axios from "axios"
import { appendAnalysisLog, generatePromptKey, type LogKind, type LogStatus } from './AnalysisLogService'

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

interface PromptAnalysisRequest {
  text: string  // Backend expects 'text' field
  clientId?: string
  mspId?: string
  correlationId?: string
}

interface PromptAnalysisResponse {
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
  private auditSearchSeq: number = 0
  // Track active scans by correlationId for cancellation
  private activeScans = new Map<string, AbortController>()
  
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
      // Load configuration from Chrome storage (support both nested and flat)
      const result = await chrome.storage.sync.get(['backendConfig', 'authUser', 'config'])
      const nested = result?.config?.backendConfig
      const flat = result?.backendConfig
      const merged = { ...(nested || {}), ...(flat || {}) }

      if (Object.keys(merged).length > 0) {
        this.config = { ...this.config, ...merged }
      }

      // If extension main config exists, follow its enabled flag
      if (result?.config?.isEnabled !== undefined) {
        this.config.enabled = !!result.config.isEnabled
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
      console.log('🔍 Testing backend connection...', { apiUrl: this.config.apiUrl })
      const headers = await this.getAuthHeaders()
      
      const url = `${this.config.apiUrl.replace(/\/$/, '')}/health`
      const response = await fetch(url, {
        method: 'GET',
        headers
      })
      console.log('🔍 Health check response:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Backend is reachable:', data)
        return true
      } else {
        const text = await response.text().catch(() => '')
        console.error('❌ Backend health check failed:', response.status, response.statusText, text)
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

  async analyzePromptInjection(text: string, correlationIdParam?: string): Promise<PromptAnalysisResponse | null> {
    // Safe initialization of correlationId at the top of the function
    const correlationId = correlationIdParam || (globalThis.crypto?.randomUUID?.() || crypto.randomUUID?.() || Math.random().toString(36).substring(2, 12))
    
    if (!this.config.enabled) {
      console.log('Backend API disabled, skipping prompt analysis', { correlationId })
      return null
    }
    
    try {
      const headers = await this.getAuthHeaders()
      headers['Content-Type'] = 'application/json'
      
      const payload: PromptAnalysisRequest = {
        text: text,
        clientId: this.config.clientId,
        mspId: this.config.mspId,
        correlationId: correlationId
      }
      
      const apiUrl = this.config.apiUrl.replace(/\/$/, '')
      const url = `${apiUrl}/api/v1/analyze/prompt`
      
      console.log('🧩 Prompt analysis started', { correlationId, promptLength: text?.length })
      console.log('🔍 Analyzing prompt with backend:', {
        correlationId,
        promptLength: text.length,
        url,
        hasAuth: !!headers['Authorization']
      })
      
      console.log('🚀 Sending prompt analysis request', { url, correlationId })
      
      const requestStart = Date.now()
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      
      const durationMs = Date.now() - requestStart
      
      console.log('📡 Backend response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorDetails = {}
        try {
          errorDetails = JSON.parse(errorText)
        } catch {
          errorDetails = { message: errorText }
        }
        
        console.error(`Prompt analysis failed [${correlationId}]:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorDetails
        })
        
        await this.logApiError('prompt_analysis', {
          status: response.status,
          statusText: response.statusText,
          error: errorDetails,
          correlationId
        })
        
        throw new Error(`Prompt analysis failed: ${response.status} ${response.statusText}`)
      }
      
      const result: PromptAnalysisResponse & { logs?: Array<{ level: string; timestamp: string; message: string; context: string }> } = await response.json()
      
      console.log('✅ Backend prompt analysis completed:', { result })
      
      await this.logApiSuccess('prompt_analysis', {
        riskLevel: result.riskLevel,
        shouldBlock: result.shouldBlock
      })

      // Append response-carried logs to unified Logs panel (de-duplicated)
      if (Array.isArray(result.logs) && result.logs.length > 0) {
        await this.appendResponseLogs(result.logs)
      }
      // Final synthesized entry
      await this.appendSingleEntry('success', 'Prompt analysis complete', 'analyze/prompt')

      // Post a single audit event and fetch recent audit events once (single-flight)
      try {
        await this.logAuditEvent({
          type: 'prompt_analysis',
          message: `Prompt analysis ${result.shouldBlock ? 'blocked' : 'completed'} (${result.riskLevel})`,
          severity: result.shouldBlock ? 'error' : 'info',
          correlationId,
          data: {
            correlationId,
            riskLevel: result.riskLevel,
            shouldBlock: result.shouldBlock
          }
        })
        await this.fetchAuditEventsOnce({ limit: 20, offset: 0 })
      } catch {}
      
      // Emit one log per prompt analysis (after analysis completes) using logAnalysisResult for consistency
      try {
        const shouldBlock = result.shouldBlock || false
        const summary = shouldBlock ? 'Blocked by policy' : 'No threats detected'
        const reason = shouldBlock ? (result.blockReason || result.summary || 'Policy violation') : undefined
        
        // Map risk level
        const riskLevel = (result.riskLevel?.toLowerCase() || (shouldBlock ? 'high' : 'none')) as 'none' | 'low' | 'medium' | 'high'
        
        const promptText = text // Store original prompt before shadowing
        
        // Build signals array for details
        const signals: string[] = []
        if (result.threats && result.threats.length > 0) {
          signals.push(...result.threats)
        }
        if (result.quickPattern) {
          signals.push('quick pattern detected')
        }
        if (result.dangerousPattern) {
          signals.push('dangerous pattern detected')
        }
        if (result.piiDetection?.hasPII) {
          signals.push(`PII detected: ${result.piiDetection.types?.join(', ') || 'unknown'}`)
        }
        
        // Log using consistent logAnalysisResult helper
        await this.logAnalysisResult({
          type: 'PROMPT_ANALYSIS',
          success: !shouldBlock,
          correlationId,
          summary,
          reason,
          durationMs,
          prompt: promptText,
          risk: riskLevel,
          details: {
            riskLevel: result.riskLevel || riskLevel,
            summary: result.summary || summary,
            threats: result.threats || [],
            signals: signals.length > 0 ? signals : undefined,
            decision: shouldBlock ? 'block' : 'allow',
            piiDetection: result.piiDetection
          }
        })
      } catch (error) {
        // Log error but don't break prompt analysis
        console.error(`Failed to log prompt analysis result [${correlationId}]:`, error)
        // Continue processing even if logging fails
      }
      
      // Return result
      return result
    } catch (error) {
      console.error(`Prompt analysis failed [${correlationId}]:`, error)
      
      // Log failure case - save to both AnalysisLogService AND audit events
      try {
        const errorMessage = (error as any)?.message || 'unknown error'
        const summary = 'Analysis failed'
        const reason = `Analysis error: ${errorMessage}`
        
        const errorPromptText = text || 'Unknown prompt'
        const textLog = `Prompt analysis failed | prompt: ${errorPromptText}; status: FAILURE; risk: high; reason: ${reason}; summary: ${summary}`
        
        const key = await generatePromptKey(errorPromptText)
        
        // Save to AnalysisLogService (for UI logs panel) using logAnalysisResult for consistency
        await this.logAnalysisResult({
          type: 'PROMPT_ANALYSIS',
          success: false,
          correlationId,
          summary: summary || 'Prompt analysis failed',
          reason: reason || errorMessage || 'Unknown error',
          prompt: errorPromptText || '',
          risk: 'high',
          error: errorMessage,
          details: {
            error: errorMessage || 'Unknown error',
            signals: ['backend error'],
            decision: 'block'
          }
        })
        
        // Also log to audit events (for backend persistence)
        try {
          await this.logAuditEvent({
            type: 'prompt_analysis',
            message: `Prompt analysis failed: ${errorMessage}`,
            severity: 'error',
            correlationId,
            data: {
              correlationId,
              error: errorMessage,
              prompt: errorPromptText.substring(0, 200), // Truncate for audit
              summary: 'Analysis failed',
              reason: reason || errorMessage
            }
          })
        } catch (auditError) {
          console.error(`Failed to log audit event [${correlationId}]:`, auditError)
        }
      } catch (logError) {
        // Log error but don't break prompt analysis
        console.error(`Failed to log prompt analysis failure [${correlationId}]:`, logError)
        // Continue processing even if logging fails
      }
      
      return null
    }
  }
  
  /**
   * Log analysis result with consistent structure for real-time UI updates
   */
  private async logAnalysisResult(params: {
    type: LogKind
    success: boolean
    correlationId: string
    summary?: string
    reason?: string
    timestamp?: string
    durationMs?: number
    prompt?: string
    file?: { name: string; size: number; mime?: string; hash?: string }
    error?: any
    risk?: 'none' | 'low' | 'medium' | 'high'
    details?: any
  }): Promise<void> {
    try {
      const status: LogStatus = params.success ? 'SUCCESS' : 'FAILURE'
      const timestamp = params.timestamp || new Date().toISOString()
      const correlationId = params.correlationId
      
      // Generate key for deduplication
      const key = params.type === 'PROMPT_ANALYSIS' && params.prompt
        ? await generatePromptKey(params.prompt)
        : `${params.type}:${timestamp}:${Math.random().toString(36).slice(2, 9)}`
      
      // Build message
      const message = params.summary || 
        (params.success 
          ? `${params.type === 'PROMPT_ANALYSIS' ? 'Prompt' : 'File'} analysis complete`
          : `${params.type === 'PROMPT_ANALYSIS' ? 'Prompt' : 'File'} analysis failed`)
      
      // Build text log
      const textLog = params.type === 'PROMPT_ANALYSIS'
        ? `${params.success ? 'Prompt analysis succeeded' : 'Prompt analysis failed'} | prompt: ${params.prompt || 'unknown'}; status: ${status}; risk: ${params.risk || 'none'}; ${params.reason ? `reason: ${params.reason};` : ''} summary: ${params.summary || ''}`
        : `${params.success ? 'File analysis succeeded' : 'File analysis failed'} | file: ${params.file?.name || 'unknown'}; status: ${status}; risk: ${params.risk || 'none'}; ${params.reason ? `reason: ${params.reason};` : ''} summary: ${params.summary || ''}`
      
      // Build entry (ensure correlationId is in meta/json for unified format)
      const entry = {
        key,
        kind: params.type,
        status,
        risk: params.risk || (params.success ? 'none' : 'high'),
        summary: params.summary || '',
        reason: params.reason || '',
        prompt: params.type === 'PROMPT_ANALYSIS' ? params.prompt : undefined,
        file: params.type === 'FILE_ANALYSIS' ? params.file : undefined,
        text: textLog,
        correlationId,
        durationMs: params.durationMs,
        timestamp,
        message: message, // Include message field for unified format support
        json: {
          correlationId,
          timestamp,
          durationMs: params.durationMs,
          error: params.error,
          ...params.details
        }
      }
      
      // Save to AnalysisLogService (triggers real-time UI update)
      await appendAnalysisLog(entry)
      
      console.log(`✅ Analysis result logged [${correlationId}]:`, {
        type: params.type,
        status,
        summary: params.summary
      })
    } catch (error) {
      console.error(`Failed to log analysis result [${params.correlationId}]:`, error)
      // Don't throw - logging shouldn't break the flow
    }
  }
  
  private async logApiError(endpoint: string, details: any): Promise<void> {
    try {
      // Use unified logs system in chrome.storage.sync
      const result = await chrome.storage.sync.get(['logs'])
      const logs = result.logs || []
      
      logs.unshift({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: 'error',
        message: `API Error: ${endpoint}`,
        category: 'api'
      })
      
      // Keep only last 100 logs
      const recentLogs = logs.slice(0, 100)
      await chrome.storage.sync.set({ logs: recentLogs })
      
      console.log('API error logged to unified logs:', endpoint)
    } catch (err) {
      console.error('Failed to log API error:', err)
    }
  }
  
  private async logApiSuccess(endpoint: string, details: any): Promise<void> {
    try {
      // Use unified logs system in chrome.storage.sync
      const result = await chrome.storage.sync.get(['logs'])
      const logs = result.logs || []
      
      logs.unshift({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: 'success',
        message: `API Success: ${endpoint}`,
        category: 'api'
      })
      
      // Keep only last 100 logs
      const recentLogs = logs.slice(0, 100)
      await chrome.storage.sync.set({ logs: recentLogs })
      
      console.log('API success logged to unified logs:', endpoint)
    } catch (err) {
      console.error('Failed to log API success:', err)
    }
  }
  
  // Append a single synthesized entry after completion
  private async appendSingleEntry(level: 'success' | 'info' | 'warning' | 'error', message: string, context: 'analyze/prompt' | 'scan/file' | 'audit/event'): Promise<void> {
    try {
      const store = await chrome.storage.sync.get(['logs'])
      const existing = store.logs || []
      const timestamp = new Date().toISOString()
      const normalizedMessage = `[${context}] ${message}`
      const dedupKey = `${timestamp}|${normalizedMessage}`
      const existingKeys = new Set(existing.map((l: any) => `${l.timestamp}|${l.message}`))
      if (existingKeys.has(dedupKey)) return
      const entry = {
        id: `${timestamp}-${Math.random().toString(36).slice(2,7)}`,
        timestamp,
        message: normalizedMessage,
        type: level === 'warning' ? 'warning' : level,
        category: 'api'
      }
      const merged = [entry, ...existing].slice(0, 200)
      await chrome.storage.sync.set({ logs: merged })
    } catch {}
  }

  // Append logs from response to unified logs storage with de-dup
  private async appendResponseLogs(entries: Array<{ level: string; timestamp: string; message: string; context: string }>): Promise<void> {
    try {
      const store = await chrome.storage.sync.get(['logs'])
      const existing = store.logs || []
      const existingKeys = new Set(existing.map((l: any) => `${l.timestamp}|${l.message}`))
      const mapped = entries
        .filter(e => !!e && !!e.timestamp && !!e.message)
        .filter(e => !existingKeys.has(`${e.timestamp}|[${e.context}] ${e.message}`))
        .map(e => ({
          id: `${e.timestamp}-${Math.random().toString(36).slice(2,7)}`,
          timestamp: e.timestamp,
          message: `[${e.context}] ${e.message}`,
          type: e.level === 'warn' ? 'warning' : (e.level === 'success' ? 'success' : (e.level || 'info')),
          category: 'api'
        }))
      const merged = [...mapped, ...existing].slice(0, 200)
      await chrome.storage.sync.set({ logs: merged })
    } catch (err) {
      console.warn('Failed to append response logs:', err)
    }
  }

  // Single-flight audit events search; merges into unified logs without duplicates
  private async fetchAuditEventsOnce(params: { limit?: number; offset?: number }): Promise<void> {
    try {
      const seq = ++this.auditSearchSeq
      const headers = await this.getAuthHeaders()
      headers['Content-Type'] = 'application/json'
      headers['Accept'] = 'application/json'
      const apiUrl = this.config.apiUrl.replace(/\/$/, '')
      const resp = await fetch(`${apiUrl}/api/v1/audit/events/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ limit: params.limit ?? 20, offset: params.offset ?? 0 })
      })
      if (seq !== this.auditSearchSeq) return
      if (!resp.ok) return
      const data = await resp.json()
      const logs = Array.isArray(data?.logs) ? data.logs : []
      const entries = logs.map((l: any) => ({
        level: (l.level || 'info'),
        timestamp: l.created_at || l.timestamp || new Date().toISOString(),
        message: l.message || l.event_type || 'audit event',
        context: 'audit/event'
      }))
      if (entries.length > 0) {
        await this.appendResponseLogs(entries)
      }
    } catch {
      // Non-fatal
    }
  }
  
  private async getSessionId(): Promise<string> {
    try {
      const result = await chrome.storage.local.get(['sessionId'])
      if (result.sessionId) {
        return result.sessionId
      }
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await chrome.storage.local.set({ sessionId })
      return sessionId
    } catch {
      return `session_${Date.now()}`
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
  
  /**
   * Cancel an active scan by correlationId
   */
  cancelScan(correlationId: string): boolean {
    const controller = this.activeScans.get(correlationId)
    if (controller) {
      console.log(`🛑 Canceling scan [${correlationId}]`)
      controller.abort()
      this.activeScans.delete(correlationId)
      return true
    }
    return false
  }
  
  /**
   * Check if a scan is currently active
   */
  isScanActive(correlationId: string): boolean {
    return this.activeScans.has(correlationId)
  }
  
  async scanFile(file: File, fileText?: string): Promise<any> {
    // Generate correlationId internally
    const correlationId = globalThis.crypto?.randomUUID?.() || crypto.randomUUID?.() || Math.random().toString(36).substring(2, 12)
    
    console.log('🔍 BackendApiService.scanFile called', { correlationId })
    console.log('🔍 Config:', this.config)
    
    // Guard: Only one active scan per correlationId
    if (this.activeScans.has(correlationId)) {
      console.warn(`⚠️ Scan already in progress for [${correlationId}], skipping duplicate request`)
      throw new Error(`Scan already in progress for correlationId: ${correlationId}`)
    }
    
    try {
      // If extension is inactive, bypass scanning and log locally
      if (!this.config.enabled) {
        console.log('⏭️ Extension inactive — allowing upload without scanning')
        await this.appendResponseLogs([
          {
            level: 'info',
            timestamp: new Date().toISOString(),
            message: 'Scanner disabled — action allowed without scanning',
            context: 'scan/file'
          }
        ])
        return {
          success: true,
          error: null,
          isMalicious: false,
          detectionCount: 0,
          totalEngines: 0,
          threats: [],
          riskLevel: 'safe',
          summary: 'Extension inactive — bypassed scanning',
          shouldBlock: false,
          blockReason: null,
          isSensitiveFile: false,
          isMaliciousFile: false,
          piiDetection: null,
          fileSize: file.size,
          fileHash: undefined,
          logs: [
            { level: 'info', timestamp: new Date().toISOString(), message: 'request received', context: 'scan/file' },
            { level: 'info', timestamp: new Date().toISOString(), message: 'scanner disabled', context: 'scan/file' },
            { level: 'success', timestamp: new Date().toISOString(), message: 'action allowed without scanning', context: 'scan/file' }
          ]
        }
      }

      const headers = await this.getAuthHeaders()
      // Include correlationId in request header for backend tracking
      if (correlationId) {
        headers['X-Correlation-Id'] = correlationId
      }

      console.log('🧩 File analysis started', { correlationId, fileName: file?.name, fileSize: file?.size })
      
      // Emit "started" log before calling backend
      await this.logAnalysisResult({
        type: 'FILE_ANALYSIS',
        success: true,
        correlationId,
        summary: 'File analysis started',
        file: {
          name: file.name,
          size: file.size,
          mime: file.type
        },
        timestamp: new Date().toISOString(),
        details: {
          stage: 'started',
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type
        }
      })
      
      // Build FormData with all required fields matching stable version
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileName', file.name)
      if (fileText) {
        formData.append('text', fileText)
      }
      // Include clientId and mspId if available (for backend routing/tracking)
      if (this.config.clientId) {
        formData.append('clientId', this.config.clientId)
      }
      if (this.config.mspId) {
        formData.append('mspId', this.config.mspId)
      }
      // Include correlationId in FormData body as well as header
      if (correlationId) {
        formData.append('correlationId', correlationId)
      }
      
      console.log('🚀 Making request to:', `${this.config.apiUrl}/api/v1/scan/file`)
      console.log('🚀 FormData contents:', {
        correlationId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        hasText: !!fileText,
        clientId: this.config.clientId,
        mspId: this.config.mspId
      })

      console.log('🚀 Request headers (axios):', headers)
      console.log('🚀 About to make axios request...')

      // Create AbortController for this scan
      const abortController = new AbortController()
      this.activeScans.set(correlationId, abortController)
      
      const requestStart = Date.now()
      
      try {
        const axiosResponse = await axios.post(
          `${this.config.apiUrl}/api/v1/scan/file`,
          formData,
          {
            headers,
            timeout: 30000,
            signal: abortController.signal,
          }
        )
        const durationMs = Date.now() - requestStart
        
        // Remove from active scans on success
        this.activeScans.delete(correlationId)

        console.log('✅ Backend file scan completed (axios):', axiosResponse.data)
        
        // Parse response - FileScanResponse format (from /api/v1/scan/file)
        const responseData = axiosResponse.data
        
        // Extract logs from response if available
        if (responseData?.logs && Array.isArray(responseData.logs)) {
          await this.appendResponseLogs(responseData.logs)
        }
        
        // Determine risk level and blocking status
        // FileScanResponse format (from /api/v1/scan/file)
        const riskLevel = (responseData?.riskLevel?.toLowerCase() || 'none') as 'none' | 'low' | 'medium' | 'high'
        const shouldBlock = responseData?.shouldBlock !== undefined 
          ? responseData.shouldBlock 
          : (responseData?.isMalicious || false)
        const summary = responseData?.summary || (shouldBlock 
          ? 'Security threat detected'
          : 'File scan completed: No threats detected')
        const reason = shouldBlock 
          ? (responseData?.blockReason || responseData?.summary || 'Security policy violation') 
          : undefined
        
        // Log file analysis result in real-time for UI
        // This ensures FILE_ANALYSIS logs appear immediately alongside PROMPT_ANALYSIS logs
        await this.logAnalysisResult({
          type: 'FILE_ANALYSIS',
          success: !shouldBlock,
          correlationId,
          summary,
          reason,
          durationMs,
          file: {
            name: file.name,
            size: file.size,
            mime: file.type,
            hash: responseData?.fileHash
          },
          risk: riskLevel,
          details: {
            riskLevel: responseData?.riskLevel || riskLevel,
            shouldBlock,
            threats: responseData?.threats || [],
            // FileScanResponse format (from /api/v1/scan/file)
            isMalicious: responseData?.isMalicious || false,
            piiDetection: responseData?.piiDetection || null,
            isSensitive: responseData?.isSensitiveFile || responseData?.isSensitiveFile || false
          }
        })
        
        // Also log to audit events (for backend persistence)
        try {
          await this.logAuditEvent({
            type: 'file_scan',
            message: `File scan ${shouldBlock ? 'blocked' : 'completed'} (${responseData?.riskLevel || riskLevel || 'unknown'})`,
            severity: shouldBlock ? 'error' : 'info',
            correlationId,
            data: {
              correlationId,
              riskLevel: responseData?.riskLevel || riskLevel,
              shouldBlock
            }
          })
          await this.fetchAuditEventsOnce({ limit: 20, offset: 0 })
        } catch (error) {
          // Log error but don't break file scanning
          console.error(`Failed to log file analysis result [${correlationId}]:`, error)
          // Continue processing even if logging fails
        }
        
        // Return response in FileScanResponse format (from /api/v1/scan/file)
        // Map to consistent format for FileGuard
        return {
          success: responseData?.success !== undefined ? responseData.success : !shouldBlock,
          error: responseData?.error || (shouldBlock ? reason : null),
          isMalicious: responseData?.isMalicious || false,
          detectionCount: responseData?.detectionCount || 0,
          totalEngines: responseData?.totalEngines || 0,
          threats: responseData?.threats || [],
          riskLevel: responseData?.riskLevel || riskLevel,
          summary: responseData?.summary || summary,
          shouldBlock: shouldBlock,
          blockReason: responseData?.blockReason || reason || undefined,
          isSensitiveFile: responseData?.isSensitiveFile || false,
          isMaliciousFile: responseData?.isMaliciousFile || responseData?.isMalicious || false,
          piiDetection: responseData?.piiDetection || null,
          fileSize: responseData?.fileSize || file.size,
          fileHash: responseData?.fileHash,
          logs: responseData?.logs || []
        }
      } catch (axiosError: any) {
        // Remove from active scans (scan finished or was canceled)
        this.activeScans.delete(correlationId)
        
        // Check if this was a cancellation
        if (axiosError.name === 'CanceledError' || axiosError.name === 'AbortError' || axiosError.code === 'ERR_CANCELED' || (abortController && abortController.signal.aborted)) {
          console.log(`🛑 Scan canceled by user [${correlationId}]`)
          
          // Emit canceled log entry
          await this.logAnalysisResult({
            type: 'FILE_ANALYSIS',
            success: false,
            correlationId,
            summary: 'Scan canceled by user',
            reason: 'User canceled the scan',
            file: {
              name: file.name,
              size: file.size,
              mime: file.type
            },
            risk: 'none',
            details: {
              status: 'canceled',
              stage: 'canceled'
            }
          })
          
          // Return canceled result
          return {
            success: false,
            error: 'Scan canceled by user',
            isMalicious: false,
            detectionCount: 0,
            totalEngines: 0,
            threats: [],
            riskLevel: 'none',
            summary: 'Scan canceled by user',
            shouldBlock: false,
            blockReason: undefined,
            isSensitiveFile: false,
            isMaliciousFile: false,
            piiDetection: null,
            fileSize: file.size,
            fileHash: undefined,
            logs: [],
            canceled: true
          }
        }
        
        // Not a cancellation - treat as error
        console.error(`File analysis failed [${correlationId}]:`, axiosError)
        
        const errorMessage = (axiosError as any)?.message || 'unknown error'
        const errorDetails = {
          error: errorMessage,
          errorType: typeof axiosError,
          ...(axios.isAxiosError && axios.isAxiosError(axiosError) ? {
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            responseData: axiosError.response?.data
          } : {})
        }
        
        console.error('❌ Error type:', typeof axiosError)
        console.error('❌ Error message:', errorMessage)
        console.error('❌ Error stack:', (axiosError as any)?.stack)
        
        // Check if it's an axios error
        if (axios.isAxiosError && axios.isAxiosError(axiosError)) {
          console.error('❌ Axios error details:', {
            message: axiosError.message,
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: axiosError.response?.data,
          })
        }
        
        // Check if it's a network error
        if ((axiosError as any)?.name === 'TypeError' && (axiosError as any)?.message?.includes('fetch')) {
          console.error('❌ Network error detected - check if backend is running')
        }

        // Log file analysis failure as FAILED_ANALYSIS with status="failed"
        await this.logAnalysisResult({
          type: 'FAILED_ANALYSIS',
          success: false,
          correlationId,
          summary: 'File analysis failed',
          reason: errorMessage,
          file: {
            name: file.name,
            size: file.size,
            mime: file.type
          },
          risk: 'high',
          error: errorMessage,
          details: errorDetails
        })
        
        // Also log to audit events (for backend persistence)
        try {
          await this.logAuditEvent({
            type: 'file_scan',
            message: `File scan failed: ${errorMessage}`,
            severity: 'error',
            correlationId,
            data: {
              correlationId,
              error: errorMessage,
              fileName: file.name,
              fileSize: file.size
            }
          })
        } catch (auditError) {
          console.error(`Failed to log audit event on failure [${correlationId}]:`, auditError)
        }
        
        // Return error result
        return {
          success: false,
          error: errorMessage,
          isMalicious: false,
          detectionCount: 0,
          totalEngines: 0,
          threats: [],
          riskLevel: 'high',
          summary: `File analysis failed: ${errorMessage}`,
          shouldBlock: true,
          blockReason: errorMessage,
          isSensitiveFile: false,
          isMaliciousFile: false,
          piiDetection: null,
          fileSize: file.size,
          fileHash: undefined,
          logs: []
        }
      }
    } catch (error) {
      // Fallback error handler for unexpected errors
      console.error(`Unexpected error in file analysis [${correlationId}]:`, error)
      this.activeScans.delete(correlationId)
      
      const errorMessage = (error as any)?.message || 'unknown error'
      
      // Log failure
      await this.logAnalysisResult({
        type: 'FAILED_ANALYSIS',
        success: false,
        correlationId,
        summary: 'File analysis failed',
        reason: errorMessage,
        file: {
          name: file.name,
          size: file.size,
          mime: file.type
        },
        risk: 'high',
        error: errorMessage,
        details: { error: errorMessage }
      })
      
      return {
        success: false,
        error: errorMessage,
        isMalicious: false,
        detectionCount: 0,
        totalEngines: 0,
        threats: [],
        riskLevel: 'high',
        summary: `File analysis failed: ${errorMessage}`,
        shouldBlock: true,
        blockReason: errorMessage,
        isSensitiveFile: false,
        isMaliciousFile: false,
        piiDetection: null,
        fileSize: file.size,
        fileHash: undefined,
        logs: []
      }
    }
  }

  async logAuditEvent(event: {
    type: string
    message: string
    severity: string
    data?: any
    correlationId?: string
  }): Promise<void> {
    if (!this.config.enabled) {
      console.log('Backend API disabled, skipping audit log')
      return
    }
    
    try {
      const headers = await this.getAuthHeaders()
      headers['Content-Type'] = 'application/json'
      
      // Safe initialization of correlationId
      const correlationId = event.correlationId || event.data?.correlationId || (globalThis.crypto?.randomUUID?.() || crypto.randomUUID?.() || Math.random().toString(36).substring(2, 12))
      
      const response = await fetch(`${this.config.apiUrl}/api/v1/audit/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event_type: event.type,
          event_category: event.type,
          message: event.message,
          severity: event.severity,
          details: { ...(event.data || {}), correlationId },
          timestamp: new Date().toISOString(),
          source: 'chrome_extension',
          client_id: this.config.clientId,
          msp_id: this.config.mspId,
          user_id: this.config.userId || null,
          correlation_id: correlationId
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