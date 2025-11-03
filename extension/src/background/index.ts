

import { FastThreatDetector } from '../utils/threatDetector'
import { BackendApiService } from '../services/BackendApiService'
import { loadAnalysisLogs, saveAnalysisLogs, clearAnalysisLogs, appendAnalysisLog, type AnalysisLog } from '../services/AnalysisLogService'

const VIRUSTOTAL_API_BASE = 'https://www.virustotal.com/api/v3'

chrome.runtime.onInstalled.addListener(async () => {
  console.log('Owlnox extension installed');
  
  // Clear any existing auth state on fresh install
  await chrome.storage.sync.remove(['authUser']);
  console.log('🔐 BACKGROUND: Cleared any existing auth state');
  
  chrome.storage.sync.set({
    config: {
      isEnabled: true,
      apiKey: '',
      geminiApiKey: '',
      backendConfig: {
        apiUrl: 'http://localhost:8000',
        enabled: true,
        clientId: 'acme-health',
        mspId: 'msp-001'
      },
      advancedSettings: {
        blockEnvFiles: true,
        realTimeScanning: true,
        debugMode: false,
        scanExecutables: false
      }
    },
    logs: [
    
    ]
  });
  
  console.log('🚀 Extension ready with Gemini 2.0 Flash for prompt injection detection!')
  
  chrome.tabs.create({
    url: chrome.runtime.getURL('tabs/options.html')
  });
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('tabs/options.html')
  });
});

// Handle side panel opening (if available)
if (chrome.sidePanel && 'onOpened' in chrome.sidePanel) {
  (chrome.sidePanel as any).onOpened.addListener(() => {
    console.log('Side panel opened');
  });
}

// Set up side panel for all tabs
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status === 'complete' && tab.url) {
    try {
      if (chrome.sidePanel && 'setOptions' in chrome.sidePanel) {
        await (chrome.sidePanel as any).setOptions({
          tabId,
          path: 'sidepanel.html',
          enabled: true
        });
      }
    } catch (error) {
      console.log('Could not set side panel for tab:', tab.url, error);
    }
  }
});

async function getUploadUrl(apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(`${VIRUSTOTAL_API_BASE}/files/upload_url`, {
      method: 'GET',
      headers: {
        'x-apikey': apiKey
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get upload URL: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.data
  } catch (error) {
    console.error('Error getting upload URL:', error)
    return null
  }
}

async function uploadFileToVirusTotal(fileData: ArrayBuffer, fileName: string, apiKey: string): Promise<string | null> {
  try {
    const fileSizeMB = fileData.byteLength / (1024 * 1024)
    let uploadUrl = `${VIRUSTOTAL_API_BASE}/files`
    
    if (fileSizeMB > 32) {
      console.log(`Large file detected (${fileSizeMB.toFixed(2)}MB), getting upload URL...`)
      const specialUploadUrl = await getUploadUrl(apiKey)
      if (!specialUploadUrl) {
        throw new Error('Failed to get upload URL for large file')
      }
      uploadUrl = specialUploadUrl
    }
    
    const formData = new FormData()
    const blob = new Blob([fileData])
    formData.append('file', blob, fileName)
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'x-apikey': apiKey
      },
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.data.id
  } catch (error) {
    console.error('Error uploading to VirusTotal:', error)
    return null
  }
}

async function getFileAnalysis(analysisId: string, apiKey: string, maxRetries = 6): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${VIRUSTOTAL_API_BASE}/analyses/${analysisId}`, {
        headers: {
          'x-apikey': apiKey
        }
      })
      
      if (!response.ok) {
        throw new Error(`Analysis fetch failed: ${response.status} ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.data.attributes.status === 'completed') {
        return result.data.attributes
      } else if (result.data.attributes.status === 'queued') {
        console.log(`Analysis queued, waiting... (attempt ${i + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, 5000)) 
        continue
      } else {
        throw new Error(`Analysis failed with status: ${result.data.attributes.status}`)
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }
  
  throw new Error('Analysis timeout - VirusTotal is taking too long to process this file')
}

async function getFileReport(fileHash: string, apiKey: string): Promise<any> {
  try {
    const response = await fetch(`${VIRUSTOTAL_API_BASE}/files/${fileHash}`, {
      headers: {
        'x-apikey': apiKey
      }
    })
    
    if (response.status === 404) {
      return null
    }
    
    if (!response.ok) {
      throw new Error(`Report fetch failed: ${response.status} ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.data.attributes
  } catch (error) {
    console.error('Error getting file report:', error)
    return null
  }
}

async function calculateFileHash(fileData: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileData)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function scanFileWithVirusTotal(fileData: ArrayBuffer, fileName: string, apiKey: string): Promise<{
  isMalicious: boolean
  detectionCount: number
  totalEngines: number
  success: boolean
  error?: string
  scanId?: string
}> {
  try {
    console.log('🛡️ VirusTotal: Starting file scan...', {
      fileName,
      fileSize: fileData.byteLength,
      apiKeyLength: apiKey.length
    })
    
    const fileHash = await calculateFileHash(fileData)
    console.log(`🛡️ VirusTotal: Calculated file hash: ${fileHash}`)

    console.log('🛡️ VirusTotal: Checking for existing report...')
    const existingReport = await getFileReport(fileHash, apiKey)
    
    if (existingReport && existingReport.last_analysis_stats) {
      console.log('🛡️ VirusTotal: Found existing report:', existingReport.last_analysis_stats)
      const stats = existingReport.last_analysis_stats
      const detectionCount = (stats.malicious || 0) + (stats.suspicious || 0)
      const totalEngines = Object.values(stats).reduce((sum: number, count: unknown) => sum + (Number(count) || 0), 0) as number
      
      const result = {
        isMalicious: detectionCount > 0,
        detectionCount,
        totalEngines,
        success: true,
        scanId: fileHash
      }
      
      console.log('🛡️ VirusTotal: Existing report result:', result)
      return result
    }
    
    console.log('🛡️ VirusTotal: No existing report found, uploading file for analysis...')
    
    const analysisId = await uploadFileToVirusTotal(fileData, fileName, apiKey)
    
    if (!analysisId) {
      console.error('❌ VirusTotal: Failed to upload file to VirusTotal')
      throw new Error('Failed to upload file to VirusTotal')
    }
    
    console.log(`🛡️ VirusTotal: File uploaded, analysis ID: ${analysisId}`)
    
    console.log('🛡️ VirusTotal: Getting analysis result...')
    const analysisResult = await getFileAnalysis(analysisId, apiKey)
    
    if (analysisResult.stats) {
      const stats = analysisResult.stats
      const detectionCount = (stats.malicious || 0) + (stats.suspicious || 0)
      const totalEngines = Object.values(stats).reduce((sum: number, count: unknown) => sum + (Number(count) || 0), 0) as number
      
      const result = {
        isMalicious: detectionCount > 0,
        detectionCount,
        totalEngines,
        success: true,
        scanId: analysisId
      }
      
      console.log('🛡️ VirusTotal: Analysis result:', result)
      return result
    }
    
    console.error('❌ VirusTotal: Invalid analysis result format:', analysisResult)
    throw new Error('Invalid analysis result format')
    
  } catch (error) {
    console.error('❌ VirusTotal: Scan error:', error)
    console.error('❌ VirusTotal: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    
    return {
      isMalicious: false,
      detectionCount: 0,
      totalEngines: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}


async function broadcastStatusChange(isEnabled: boolean) {
  try {
    const tabs = await chrome.tabs.query({
      url: ['https://chatgpt.com/*', 'https://chat.openai.com/*', 'http://127.0.0.1:*/*', 'http://localhost:*/*']
    });
    
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'STATUS_CHANGED',
            isEnabled
          });
        } catch (error) {
        }
      }
    }
  } catch (error) {
    console.error('Error broadcasting status change:', error);
  }
}

async function broadcastAuthStatusChange(isAuthenticated: boolean) {
  try {
    console.log('🔐 BACKGROUND: Broadcasting auth status change:', isAuthenticated)
    const tabs = await chrome.tabs.query({
      url: ['https://chatgpt.com/*', 'https://chat.openai.com/*', 'http://127.0.0.1:*/*', 'http://localhost:*/*']
    });
    
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'AUTH_STATUS_CHANGED',
            isAuthenticated
          });
        } catch (error) {
          console.log('Could not send auth status to tab:', tab.id, error)
        }
      }
    }
  } catch (error) {
    console.error('Error broadcasting auth status change:', error);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle ANALYSIS_LOG messages
  if (request.kind === 'ANALYSIS_LOG_GET') {
    (async () => {
      try {
        // Use static import to avoid cross-bundle issues
        const logs = await loadAnalysisLogs()
        sendResponse({ ok: true, logs })
      } catch (error) {
        console.error('Failed to get analysis logs:', error)
        sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    })()
    return true // Required for async sendResponse
  }
  
  // Handle new ANALYSIS_LOG_ADD message from shared logger
  if (request.kind === 'ANALYSIS_LOG_ADD') {
    (async () => {
      try {
        // Convert the simplified log entry to full analysis log format
        const entry = request.entry
        if (!entry || !entry.kind || !entry.status) {
          sendResponse({ ok: false, error: 'Invalid entry: missing required fields' })
          return
        }
        
        // For simplified entries, we still need to create a proper analysis log
        // This is a bridge between the shared logger and AnalysisLogService
        // We'll create a minimal analysis log entry with all required fields
        const timestamp = entry.ts || new Date().toISOString()
        
        // Generate stable key for deduplication
        // For PROMPT_ANALYSIS: use prompt hash if available
        let key: string
        // For PROMPT_ANALYSIS or fallback
        key = `${entry.kind}:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`
        
        // Log for debugging
        if (entry.kind === 'PROMPT_ANALYSIS' || entry.kind === 'FILE_ANALYSIS') {
          console.log(`[AnalysisLog] Processing ${entry.kind} log:`, {
            status: entry.status,
            message: entry.message,
            timestamp: timestamp
          })
        }
        
        // Determine risk level from details or status
        const riskLevel = (entry.details?.riskLevel?.toLowerCase() || 
                          (entry.status === 'FAILURE' ? 'high' : 'none')) as 'none' | 'low' | 'medium' | 'high'
        
        // Build summary and reason - use message as summary (already clear from logging)
        const summary = entry.message || 
                       (entry.status === 'SUCCESS' 
                         ? 'Prompt analysis complete'
                         : 'Prompt analysis failed')
        // Ensure reason is never undefined - extract error from multiple possible sources
        let reason = ''
        if (entry.status === 'FAILURE') {
          // Try multiple sources for error message
          reason = entry.details?.error || 
                  entry.details?.message || 
                  entry.details?.err?.message ||
                  entry.details?.err?.error ||
                  entry.details?.err?.detail ||
                  entry.message || 
                  'Unexpected error occurred'
          // Final fallback - never show undefined
          if (!reason || reason === 'undefined') {
            reason = 'Unexpected error occurred'
          }
        }
        
        // Convert to unified format: { createdAt, kind, status, message, meta, details }
        // appendAnalysisLog will generate the ID automatically
        // Merge entry.meta (if provided) with auto-generated meta fields
        // Preserve entry.details separately from meta
        const providedMeta = entry.meta || {}
        const providedDetails = entry.details || {}
        
        // Extract prompt from details if present (for promptPreview in meta)
        const promptText = providedDetails.prompt || providedMeta.prompt || ''
        const promptPreview = providedMeta.promptPreview || (promptText ? promptText.substring(0, 200).replace(/\n/g, ' ').trim() : undefined)
        
        // Build unified log
        const unifiedLog: Omit<AnalysisLog, 'id'> = {
          createdAt: timestamp,
          kind: entry.kind,
          status: entry.status,
          message: entry.message || summary,
          meta: {
            key,
            risk: riskLevel,
            summary,
            reason,
            ...providedMeta, // Merge provided meta (e.g., promptPreview, promptLength, model)
            // Add promptPreview if we have prompt text
            ...(promptPreview ? { promptPreview } : {}),
            ...(promptText ? { promptLength: promptText.length } : {}),
            timestamp // Keep timestamp in meta for backward compatibility
          },
          // Preserve details separately (e.g., full prompt text, policyId, rule)
          details: providedDetails.prompt || providedDetails.error || Object.keys(providedDetails).length > 0
            ? providedDetails
            : undefined
        }
        
        await appendAnalysisLog(unifiedLog)
        
        // Log for debugging
        console.log('[AnalysisLog] Analysis log added:', {
          kind: entry.kind,
          status: entry.status,
          message: entry.message || summary,
          timestamp: timestamp
        })
        
        // Broadcast update to all listeners (same runtime message as prompt logs)
        try {
          chrome.runtime.sendMessage({ kind: 'ANALYSIS_LOGS_UPDATED' }).catch(() => {})
        } catch (e) {
          console.error('Failed to broadcast logs update:', e)
        }
        
        sendResponse({ ok: true })
      } catch (error) {
        console.error('Failed to add analysis log:', error)
        sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    })()
    return true
  }
  
  if (request.kind === 'ANALYSIS_LOG_APPEND') {
    (async () => {
      try {
        // Noise filter function - drop ACCESS/audit noise
        function isNoise(entryOrText: any): boolean {
          const s = typeof entryOrText === 'string' ? entryOrText : (entryOrText?.text || entryOrText?.message || '')
          // Drop ACCESS/audit/events and API noise
          return /\[ACCESS\]/.test(s)
              || /\[audit\/event\]/i.test(s)
              || /\/api\/v1\/audit\/events/.test(s)
              || /API Success:/.test(s)
              || /User action:/.test(s)
              || /User login/.test(s)
              || /navigation/.test(s)
        }
        
        const entry = request.entry
        
        // Ignore noise entries
        if (!entry || isNoise(entry)) {
          sendResponse({ ok: true, ignored: true })
          return
        }
        
        // Ensure required fields
        if (!entry.key || !entry.kind || !entry.status) {
          sendResponse({ ok: false, error: 'Invalid entry: missing required fields' })
          return
        }
        
        // Process both PROMPT_ANALYSIS and FILE_ANALYSIS
        if (entry.kind !== 'PROMPT_ANALYSIS' && entry.kind !== 'FILE_ANALYSIS') {
          sendResponse({ ok: true, ignored: true })
          return
        }
        
        // Load current logs - use static import
        const existingLogs = await loadAnalysisLogs()
        
        // Remove any existing entry with the same key (deduplication)
        const filteredLogs = existingLogs.filter(log => log.key !== entry.key)
        
        // Prepend new entry (newest first)
        const updatedLogs = [entry, ...filteredLogs].slice(0, 2000)
        
        // Save to storage
        await saveAnalysisLogs(updatedLogs)
        
        // Broadcast update to all listeners
        try {
          chrome.runtime.sendMessage({ kind: 'ANALYSIS_LOGS_UPDATED' }).catch(() => {})
        } catch (e) {
          console.error('Failed to broadcast logs update:', e)
        }
        
        sendResponse({ ok: true })
      } catch (error) {
        console.error('Failed to append analysis log:', error)
        sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    })()
    return true
  }
  
  if (request.kind === 'ANALYSIS_LOG_CLEAR') {
    (async () => {
      try {
        // Use static import to avoid cross-bundle issues
        await clearAnalysisLogs()
        sendResponse({ ok: true })
      } catch (error) {
        console.error('Failed to clear analysis logs:', error)
        sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    })()
    return true
  }

  // Original message handler continues below
  console.log('Background: Received message:', request.type, 'from', sender.tab?.url || 'extension')
  
  // Authentication check for sensitive operations
  // TEST_PROMPT_INJECTION now requires authentication to ensure backend dependency
  const requiresAuth = ['SCAN_FILE', 'INCREMENT_INTERACTION', 'TEST_PROMPT_INJECTION'].includes(request.type)
  
  if (requiresAuth) {
    chrome.storage.sync.get(['authUser'], (result) => {
      const isAuthenticated = result.authUser && result.authUser.token
      
      if (!isAuthenticated) {
        console.log('🔐 BACKGROUND: Authentication required for', request.type)
        sendResponse({ 
          success: false, 
          error: 'Authentication required. Please log in to use this feature.',
          requiresAuth: true
        })
        return
      }
      
      // Continue with the original request handling
      handleAuthenticatedRequest(request, sender, sendResponse)
    })
    return true
  }
  
  // Handle non-authenticated requests
  handleNonAuthenticatedRequest(request, sender, sendResponse)
  return true
})

async function handleNonAuthenticatedRequest(request: any, sender: any, sendResponse: any) {
  switch (request.type) {
    case 'TEST_CONNECTION':
      console.log('Background: Test connection successful')
      sendResponse({ success: true, message: 'Background script is working!' })
      break
    case 'TEST_BACKEND_CONNECTION':
      (async () => {
        try {
          const api = BackendApiService.getInstance()
          await api.initialize()
          const ok = await api.testConnection()
          const cfg = api.getConfig()
          sendResponse({ success: ok, apiUrl: cfg.apiUrl, enabled: cfg.enabled })
        } catch (e) {
          sendResponse({ success: false, error: e instanceof Error ? e.message : String(e) })
        }
      })()
      break
    case 'GET_CONFIG':
      chrome.storage.sync.get(['config'], (result) => {
        const config = result.config || {
          isEnabled: true,
          apiKey: '', 
          geminiApiKey: '', 
          advancedSettings: {
            blockEnvFiles: true,
            realTimeScanning: true,
            debugMode: false,
            scanExecutables: false
          }
        }
        console.log('GET_CONFIG response:', config)
        sendResponse(config)
      })
      break
      
    case 'SAVE_CONFIG':
      console.log('🔄 Background: SAVE_CONFIG received with isEnabled:', request.config.isEnabled)
      chrome.storage.sync.set({ config: request.config }, async () => {
        console.log('🔄 Background: Config saved, broadcasting status change')
        await broadcastStatusChange(request.config.isEnabled);
        
        // Auto-enable/disable backend integration based on extension status
        const updatedConfig = {
          ...request.config,
          backendConfig: {
            ...request.config.backendConfig,
            enabled: request.config.isEnabled
          }
        };
        
        console.log('🔄 Background: Updated config with backend enabled:', updatedConfig.backendConfig.enabled)
        
        // Save the updated config with backend status
        chrome.storage.sync.set({ config: updatedConfig });
        
        sendResponse({ success: true });
      });
      break;
      
    case 'CLEAR_LOGS':
      chrome.storage.sync.set({ logs: [] }, () => {
        sendResponse({ success: true });
      });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

async function handleAuthenticatedRequest(request: any, sender: any, sendResponse: any) {
  switch (request.type) {
    case 'CANCEL_SCAN':
      (async () => {
        try {
          // Use static import instead of dynamic import to avoid Worker/importScripts issues
          const backendApi = BackendApiService.getInstance()
          await backendApi.initialize()
          
          const correlationId = request.correlationId
          if (!correlationId) {
            sendResponse({ success: false, error: 'No correlationId provided' })
            return
          }
          
          const canceled = backendApi.cancelScan(correlationId)
          console.log(`🛑 CANCEL_SCAN: Cancel request for [${correlationId}]:`, canceled ? 'success' : 'not found')
          
          sendResponse({ success: canceled, canceled })
        } catch (error) {
          console.error('Failed to cancel scan:', error)
          sendResponse({ success: false, error: String(error) })
        }
      })()
      return true
      
    case 'SCAN_FILE':
      (async () => {
        // Generate correlationId before any API call
        const correlationId = request.correlationId || (globalThis.crypto?.randomUUID?.() || crypto.randomUUID?.() || Math.random().toString(36).substring(2, 12))
        
        try {
          console.log('🔍 SCAN_FILE: Starting file scan process...', { correlationId })
          console.log('🔍 SCAN_FILE: Request details:', {
            fileName: request.fileName,
            fileSize: request.fileData ? (Array.isArray(request.fileData) ? request.fileData.length : request.fileData.byteLength) : 'unknown',
            fileDataType: Array.isArray(request.fileData) ? 'array' : typeof request.fileData,
            correlationId
          })
          
          const { config } = await chrome.storage.sync.get(['config'])
          console.log('🔍 SCAN_FILE: Config loaded:', {
            isEnabled: config?.isEnabled,
            backendEnabled: config?.backendConfig?.enabled,
            backendUrl: config?.backendConfig?.apiUrl
          })
          
          if (!config || !config.isEnabled) {
            console.log('⏸️ SCAN_FILE: Scanner is disabled, skipping scan')
            sendResponse({ 
              success: false, 
              error: 'Scanner is disabled',
              isMalicious: false,
              detectionCount: 0,
              totalEngines: 0
            })
            return
          }

          if (!config.backendConfig?.enabled) {
            console.log('⏸️ SCAN_FILE: Backend is disabled, skipping scan')
            sendResponse({ 
              success: false, 
              error: 'Backend scanning is disabled',
              isMalicious: false,
              detectionCount: 0,
              totalEngines: 0
            })
            return
          }
          
          let fileData: ArrayBuffer
          if (Array.isArray(request.fileData)) {
            fileData = new Uint8Array(request.fileData).buffer
            console.log('🔍 SCAN_FILE: Converted array to ArrayBuffer, size:', fileData.byteLength)
          } else if (request.fileData instanceof ArrayBuffer) {
            fileData = request.fileData
            console.log('🔍 SCAN_FILE: Using ArrayBuffer directly, size:', fileData.byteLength)
          } else {
            console.error('❌ SCAN_FILE: Invalid file data format:', typeof request.fileData)
            throw new Error('Invalid file data format')
          }
          
          console.log('🔍 SCAN_FILE: Sending file to backend for scanning...')
          
          // Use BackendApiService to scan file (handles FormData, logging, and all file processing)
          // Use static import instead of dynamic import to avoid Worker/importScripts issues
          const backendApi = BackendApiService.getInstance()
          await backendApi.initialize()
          
          // Convert ArrayBuffer back to File for BackendApiService.scanFile()
          // Preserve original file type if provided in request, otherwise use application/octet-stream
          const fileBlob = new Blob([fileData])
          const fileType = request.fileType || 'application/octet-stream'
          const reconstructedFile = new File([fileBlob], request.fileName, { 
            type: fileType,
            lastModified: Date.now()
          })
          
          console.log('🔍 SCAN_FILE: Reconstructed file:', {
            name: reconstructedFile.name,
            size: reconstructedFile.size,
            type: reconstructedFile.type
          })
          
          // Call BackendApiService.scanFile() - generates correlationId internally and handles all logging
          const scanResult = await backendApi.scanFile(reconstructedFile)
          
          if (!scanResult) {
            throw new Error('Backend API returned null result')
          }
          
          console.log('✅ SCAN_FILE: Backend scan completed:', scanResult)
          
          sendResponse({
            ...scanResult,
            requestId: correlationId
          })
          return
          
        } catch (error) {
          console.error('File analysis failed:', error)
          
          // Ensure error message is never undefined
          let errorMessage = 'Unknown error occurred during file scan'
          if (error instanceof Error) {
            errorMessage = error.message || errorMessage
            if (error.name === 'AbortError' || errorMessage.includes('timeout')) {
              errorMessage = 'Request timed out after 30 seconds'
            }
          } else if (typeof error === 'string') {
            errorMessage = error
          }
          
          sendResponse({ 
            success: false, 
            error: errorMessage,
            isMalicious: false,
            detectionCount: 0,
            totalEngines: 0,
            shouldBlock: false
          })
        }
      })()
      break;
      
    case 'TEST_PROMPT_INJECTION':
      (async () => {
        // Safe initialization of correlationId at the top
        const correlationId = request.correlationId || (globalThis.crypto?.randomUUID?.() || crypto.randomUUID?.() || Math.random().toString(36).substring(2, 12))
        
        console.log('='.repeat(80))
        console.log('🚨 TEST_PROMPT_INJECTION REQUEST RECEIVED')
        console.log('='.repeat(80))
        console.log('🧩 Prompt analysis started', { correlationId })
        
        try {
          const { prompt } = request
          
          const truncate = (t: string, n = 2000) => (t.length > n ? `${t.substring(0, n)}... [TRUNCATED]` : t)
          const safePrompt = typeof prompt === 'string' ? prompt : ''
          const preview100 = safePrompt ? `${safePrompt.substring(0, 100)}${safePrompt.length > 100 ? '...' : ''}` : 'N/A'
          const previewSent = truncate(safePrompt, 500)

          console.log('📥 REQUEST DETAILS:')
          console.log('   Prompt received:', !!safePrompt)
          console.log('   Prompt type:', typeof prompt)
          console.log('   Prompt length:', safePrompt.length, 'characters')
          console.log('   Prompt preview (100 chars):', preview100)
          console.log('   Prompt preview (500 chars):', safePrompt.substring(0, 500))
          console.log('   FULL PROMPT:', safePrompt)
          console.log('   Full prompt length:', safePrompt.length)
          console.log('\n🔍 VERIFICATION:')
          console.log('   Prompt is string:', typeof safePrompt === 'string')
          console.log('   Prompt has content:', safePrompt.length > 0)
          console.log('   Will be sent to backend:', true)
          
          if (!safePrompt) {
            console.error('❌ Invalid prompt:', { prompt, type: typeof prompt })
            sendResponse({
              success: false,
              error: 'Invalid prompt provided',
              isThreats: false,
              threats: [],
              riskLevel: 'safe'
            })
            return
          }

          // Step 1: Log captured prompt content
          console.log('\n📝 STEP 1: Logging prompt to extension storage')
          console.log('   Prompt to log:', safePrompt.substring(0, 200))
          
          await chrome.runtime.sendMessage({
            type: 'ADD_LOG',
            message: `📝 PROMPT CAPTURED (length=${safePrompt.length}):\n"${previewSent}"\n\nFULL PROMPT:\n${safePrompt}`,
            logType: 'info',
            category: 'prompt_injection'
          })
          
          console.log('✅ Prompt logged to extension storage')

          // Load config/auth
          console.log('\n📝 STEP 2: Loading config and authentication')
          const storage = await chrome.storage.sync.get(['config', 'authUser'])
          console.log('📦 Storage contents loaded:')
          console.log('   - Has config:', !!storage.config)
          console.log('   - Has backend config:', !!storage.config?.backendConfig)
          console.log('   - Backend enabled:', storage.config?.backendConfig?.enabled)
          console.log('   - API URL:', storage.config?.backendConfig?.apiUrl)
          console.log('   - Has auth user:', !!storage.authUser)
          console.log('   - Has token:', !!storage.authUser?.token)
          console.log('   - Token preview:', storage.authUser?.token ? storage.authUser.token.substring(0, 20) + '...' : 'none')
          
          const apiUrl = (storage?.config?.backendConfig?.apiUrl || 'http://localhost:8000').replace(/\/$/, '')
          const hasAuth = !!(storage?.authUser?.token)
          const headers: Record<string, string> = { 'Content-Type': 'application/json' }
          if (hasAuth) headers['Authorization'] = `Bearer ${storage.authUser.token}`
          
          console.log('\n📝 STEP 3: Config prepared')
          console.log('   - Target API URL:', apiUrl)
          console.log('   - Has authentication:', hasAuth)
          console.log('   - Headers:', Object.keys(headers).join(', '))

          // Step 4: Announce API call intent with payload preview
          console.log('\n📝 STEP 4: Preparing API call payload')
          const payload = { text: safePrompt, clientId: storage?.config?.backendConfig?.clientId, mspId: storage?.config?.backendConfig?.mspId, correlationId }
          
          console.log('📋 Payload details:')
          console.log('   - Text length:', safePrompt.length)
          console.log('   - Text (first 100 chars):', safePrompt.substring(0, 100))
          console.log('   - Client ID:', payload.clientId)
          console.log('   - MSP ID:', payload.mspId)
          console.log('   - Payload JSON size:', JSON.stringify(payload).length, 'bytes')
          console.log('   - Full prompt being sent:', safePrompt)
          
          // Log FULL prompt to extension storage
          await chrome.runtime.sendMessage({
            type: 'ADD_LOG',
            message: `➡️ CALLING BACKEND API: POST ${apiUrl}/api/v1/analyze/prompt
Headers: Content-Type: application/json, Authorization: ${hasAuth ? 'Bearer TOKEN_PRESENT' : 'absent'}
Payload size: ${JSON.stringify(payload).length} bytes
Full prompt being sent:
"${safePrompt}"
Client ID: ${payload.clientId}
MSP ID: ${payload.mspId}`,
            logType: 'info',
            category: 'prompt_injection'
          })

          // Step 5: Perform API call
          console.log('\n📝 STEP 5: Sending request to backend API')
          console.log(`   Method: POST`)
          console.log(`   URL: ${apiUrl}/api/v1/analyze/prompt`)
          console.log(`   Payload size: ${JSON.stringify(payload).length} bytes`)
          console.log(`   Request timestamp: ${new Date().toISOString()}`)
          let rawText = ''
          let status = 0
          let statusText = ''
          const requestStartTime = Date.now()
          
          try {
          console.log('\n📡 SENDING FETCH REQUEST TO BACKEND...')
          console.log('   Target:', `${apiUrl}/api/v1/analyze/prompt`)
          console.log('   Full URL:', `${apiUrl}/api/v1/analyze/prompt`)
          console.log('   Request method: POST')
          console.log('   Request headers:', JSON.stringify(headers, null, 2))
          console.log('\n📋 PAYLOAD BEING SENT TO BACKEND:')
          console.log(JSON.stringify(payload, null, 2))
          console.log('\n🔍 PAYLOAD VERIFICATION:')
          console.log('   Prompt text in payload:', payload.text)
          console.log('   Prompt length in payload:', payload.text.length)
          console.log('   Full prompt being sent to backend:', safePrompt)
            
            const resp = await fetch(`${apiUrl}/api/v1/analyze/prompt`, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload)
            })
            
            const requestDuration = Date.now() - requestStartTime
            status = resp.status
            statusText = resp.statusText
            rawText = await resp.text()
            
            console.log(`\n✅ BACKEND RESPONSE RECEIVED in ${requestDuration}ms`)
            console.log(`   Status: ${status} ${statusText}`)
            console.log(`   Response headers:`, Object.fromEntries(resp.headers.entries()))
            console.log(`   Response length: ${rawText.length} characters`)
            console.log(`   Response preview:`, rawText.substring(0, 500))
            console.log(`   Full response:`, rawText)
            
            // Log the response to extension storage
            console.log('\n📝 LOGGING BACKEND RESPONSE TO EXTENSION:')
            console.log('   Response will be stored in extension logs')
            
            // Log to extension storage
            await chrome.runtime.sendMessage({
              type: 'ADD_LOG',
              message: `⬅️ BACKEND RESPONSE RECEIVED (${requestDuration}ms):
Status: ${status} ${statusText}
Response length: ${rawText.length} chars
Response: ${rawText.substring(0, 1000)}${rawText.length > 1000 ? '...' : ''}`,
              logType: status >= 200 && status < 300 ? 'success' : 'error',
              category: 'prompt_injection'
            })
          } catch (e) {
            const requestDuration = Date.now() - requestStartTime
            console.error(`\n❌ BACKEND REQUEST FAILED after ${requestDuration}ms [${correlationId}]:`)
            console.error('   Error:', e)
            console.error('   Error type:', e instanceof Error ? e.name : typeof e)
            console.error('   Error message:', e instanceof Error ? e.message : String(e))
            console.error('   Stack:', e instanceof Error ? e.stack : 'no stack')
            await chrome.runtime.sendMessage({
              type: 'ADD_LOG',
              message: `❌ API ERROR [${correlationId}]: network failure ${e instanceof Error ? e.message : String(e)}`,
              logType: 'error',
              category: 'prompt_injection'
            })
            // Backend dependency: return error and block prompt
            sendResponse({ 
              success: false, 
              error: `Backend unreachable: ${e instanceof Error ? e.message : String(e)}`,
              isThreats: false, 
              threats: [], 
              riskLevel: 'error', 
              summary: 'Unable to analyze prompt - backend unreachable',
              backendUnreachable: true
            })
            return
          }

          // Step 6: Check for HTTP errors - backend dependency
          console.log('\n📝 STEP 6: Validating HTTP response')
          if (status < 200 || status >= 300) {
            console.error('❌ HTTP ERROR: Status code', status, statusText)
            console.error('   This means the backend API call FAILED')
            console.error('   Response text:', rawText)
            
            await chrome.runtime.sendMessage({
              type: 'ADD_LOG',
              message: `❌ HTTP ERROR - BACKEND FAILED: ${status} ${statusText}
Response: ${rawText.substring(0, 500)}
PROMPT WILL BE BLOCKED DUE TO BACKEND FAILURE`,
              logType: 'error',
              category: 'prompt_injection'
            })
            
            sendResponse({ 
              success: false, 
              error: `Backend returned error: ${status} ${statusText}`,
              isThreats: false, 
              threats: [], 
              riskLevel: 'error', 
              summary: `Backend returned HTTP error: ${statusText}` 
            })
            return
          }
          
          console.log('✅ HTTP response OK:', status, statusText)

          // Step 7: Parse JSON safely
          console.log('\n📝 STEP 7: Parsing JSON response')
          let result: any = null
          try {
            result = rawText ? JSON.parse(rawText) : null
            console.log('✅ JSON parsed successfully')
            console.log('   Result keys:', Object.keys(result))
            console.log('   isThreats:', result?.isThreats)
            console.log('   riskLevel:', result?.riskLevel)
            console.log('   shouldBlock:', result?.shouldBlock)
            console.log('   Full result:', JSON.stringify(result, null, 2))
          } catch (e) {
            console.error('❌ JSON PARSE FAILED:')
            console.error('   Error:', e)
            console.error('   Raw text:', rawText.substring(0, 500))
            
            await chrome.runtime.sendMessage({
              type: 'ADD_LOG',
              message: `❌ RESPONSE PARSE ERROR: ${e instanceof Error ? e.message : String(e)}
Raw response: ${rawText.substring(0, 500)}
PROMPT WILL BE BLOCKED DUE TO PARSE FAILURE`,
              logType: 'error',
              category: 'prompt_injection'
            })
          }

          // If no result, return error (backend dependency)
          console.log('\n📝 STEP 8: Validating parsed result')
          if (!result) {
            console.error('❌ No result from backend - BLOCKING prompt')
            console.error('   This means the backend API call did not return valid data')
            console.error('   Prompt will be BLOCKED for security')
            
            sendResponse({ 
              success: false, 
              error: 'Backend returned empty result',
              isThreats: false, 
              threats: [], 
              riskLevel: 'error', 
              summary: 'Backend returned empty/invalid result' 
            })
            return
          }
          
          console.log('✅ Result validated successfully')

          // Final: return backend result through
          console.log('\n📝 STEP 9: Returning result to content script')
          console.log('   isThreats:', result.isThreats)
          console.log('   shouldBlock:', result.shouldBlock)
          console.log('   riskLevel:', result.riskLevel)
          sendResponse({
            success: true,
            isThreats: !!result.isThreats,
            threats: result.threats || [],
            riskLevel: result.riskLevel || 'safe',
            summary: result.summary || '',
            scanType: 'backend',
            shouldBlock: result.shouldBlock,
            blockReason: result.blockReason,
            piiDetection: result.piiDetection
          })
          return
          
          if (result.isThreats) {
            chrome.runtime.sendMessage({
              type: 'ADD_LOG',
              message: `🚨 INJECTION DETECTED (${analysisMethod}): ${result.riskLevel.toUpperCase()} risk - ${result.summary}`,
              logType: 'error',
              category: 'prompt_injection'
            })
            
            for (const threat of result.threats) {
              chrome.runtime.sendMessage({
                type: 'ADD_LOG',
                message: `⚠️ THREAT TYPE: ${threat}`,
                logType: 'warning',
                category: 'prompt_injection'
              })
            }
            
            chrome.runtime.sendMessage({
              type: 'ADD_LOG',
              message: `🚫 BLOCKED: "${prompt.substring(0, 200)}${prompt.length > 200 ? '...' : ''}"`,
              logType: 'error',
              category: 'prompt_injection'
            })
          } else {
            chrome.runtime.sendMessage({
              type: 'ADD_LOG',
              message: `✅ SAFE PROMPT (${analysisMethod}): ${result.summary}`,
              logType: 'success',
              category: 'normal_prompt'
            })
          }
          
          sendResponse({
            success: true,
            isThreats: result.isThreats,
            threats: result.threats,
            riskLevel: result.riskLevel,
            summary: result.summary,
            scanType: analysisMethod,
            quickPattern: result.quickPattern,
            dangerousPattern: result.dangerousPattern,
            shouldBlock: result.shouldBlock,
            blockReason: result.blockReason,
            piiDetection: result.piiDetection
          })
          
        } catch (error) {
          console.error(`❌ Error testing prompt injection [${correlationId}]:`, error)
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            isThreats: false,
            threats: [],
            riskLevel: 'safe',
            correlationId
          })
        }
      })()
      break;
      
    case 'ADD_LOG':
      chrome.storage.sync.get(['logs', 'config'], async (result) => {
        const logs = result.logs || [];
        const newLog = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          message: request.message,
          type: request.logType || 'info',
          category: request.category || 'system'
        };
        logs.unshift(newLog);
        const trimmedLogs = logs.slice(0, 100);
        
        chrome.storage.sync.set({ logs: trimmedLogs }, () => {
          sendResponse({ success: true });
        });
        
        // Send to backend if enabled
        console.log('🔄 ADD_LOG: Checking backend config:', result.config?.backendConfig)
        console.log('🔄 ADD_LOG: Backend enabled?', result.config?.backendConfig?.enabled)
        console.log('🔄 ADD_LOG: Extension enabled?', result.config?.isEnabled)
        
        if (result.config?.backendConfig?.enabled) {
          // Hourly throttle by category+message (use chrome.storage.local in service worker)
          const throttleKey = `audit_throttle_${(request.category || 'system')}_${request.message}`
          const nowTs = Date.now()
          let lastSent = 0
          try {
            const stored = await chrome.storage.local.get([throttleKey])
            lastSent = stored?.[throttleKey] ? parseInt(stored[throttleKey], 10) : 0
          } catch (_) {}
          const oneHourMs = 3600000
          if (lastSent && nowTs - lastSent < oneHourMs) {
            console.log('⏸️ ADD_LOG: Skipping backend audit due to hourly throttle:', throttleKey)
            return
          }
          try {
            await chrome.storage.local.set({ [throttleKey]: String(nowTs) })
          } catch (_) {}

          const payload = {
            event_type: request.category || 'system',
            event_category: request.category || 'system',
            message: request.message,
            severity: request.logType || 'info',
            details: { source: 'chrome_extension' },
            timestamp: new Date().toISOString(),
            source: 'chrome_extension',
            client_id: result.config.backendConfig.clientId,
            msp_id: result.config.backendConfig.mspId,
            user_id: result.config.backendConfig.userId || null
          }
          
          // Get auth token for audit logging
          const authResult = await chrome.storage.sync.get(['authUser'])
          const authHeaders: Record<string, string> = {
            'Content-Type': 'application/json'
          }
          
          if (authResult.authUser && authResult.authUser.token) {
            authHeaders['Authorization'] = `Bearer ${authResult.authUser.token}`
            console.log('🔐 ADD_LOG: Using auth token for audit logging')
          } else {
            console.log('❌ ADD_LOG: No auth token found, audit logging will fail authentication')
          }

          console.log('🚀 Sending log to backend:', {
            url: `${result.config.backendConfig.apiUrl}/api/v1/audit/events`,
            payload: payload,
            headers: authHeaders
          });

          fetch(`${result.config.backendConfig.apiUrl}/api/v1/audit/events`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(payload)
          })
          .then(response => {
            console.log('📡 Backend response status:', response.status);
            console.log('📡 Backend response headers:', Object.fromEntries(response.headers.entries()));
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
          })
          .then(data => {
            console.log('✅ Backend log successful:', data);
          })
          .catch(error => {
            console.error('❌ Failed to send log to backend:', error);
            console.error('❌ Error details:', {
              message: error.message,
              stack: error.stack,
              name: error.name
            });
          });
        } else {
          console.log('⏸️ Backend logging skipped - backend not enabled');
        }
      });
      break;
      
    case 'INCREMENT_INTERACTION':
      (async () => {
        try {
          console.log('📊 INCREMENT_INTERACTION: Processing interaction increment...')
          console.log('📊 INCREMENT_INTERACTION: Request details:', {
            clientId: request.clientId,
            applicationId: request.applicationId,
            interactionType: request.interactionType,
            metadata: request.metadata
          })
          
          const { config } = await chrome.storage.sync.get(['config'])
          console.log('📊 INCREMENT_INTERACTION: Config loaded:', {
            backendEnabled: config?.backendConfig?.enabled,
            backendUrl: config?.backendConfig?.apiUrl
          })
          
          if (!config?.backendConfig?.enabled) {
            console.log('⏸️ INCREMENT_INTERACTION: Backend is disabled, skipping increment')
            sendResponse({ 
              success: false, 
              error: 'Backend integration is disabled'
            })
            return
          }
          
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          }
          
          // Get auth token
          const authResult = await chrome.storage.sync.get(['authUser'])
          if (authResult.authUser && authResult.authUser.token) {
            headers['Authorization'] = `Bearer ${authResult.authUser.token}`
            console.log('🔐 INCREMENT_INTERACTION: Using auth token for request')
          } else {
            console.log('❌ INCREMENT_INTERACTION: No auth token found')
            sendResponse({ 
              success: false, 
              error: 'Authentication required'
            })
            return
          }
          
          const payload = {
            app_id: request.applicationId,
            interaction_count: 1,
            interaction_type: request.interactionType || 'file_upload',
            metadata: request.metadata || {}
          }
          
          console.log('🚀 INCREMENT_INTERACTION: Sending to backend:', {
            url: `${config.backendConfig.apiUrl}/api/v1/clients/${request.clientId}/interactions/increment`,
            payload: payload,
            headers: headers
          })

          const response = await fetch(`${config.backendConfig.apiUrl}/api/v1/clients/${request.clientId}/interactions/increment`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
          })
          
          console.log('📡 INCREMENT_INTERACTION: Backend response status:', response.status)
          
          if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ INCREMENT_INTERACTION: Backend request failed:', response.status, errorText)
            throw new Error(`Backend request failed: ${response.status} ${response.statusText}`)
          }
          
          const result = await response.json()
          console.log('✅ INCREMENT_INTERACTION: Backend response:', result)
          
          sendResponse({
            success: true,
            message: result.message || 'Interaction count incremented successfully'
          })
          
        } catch (error) {
          console.error('❌ INCREMENT_INTERACTION: Error during increment:', error)
          sendResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })()
      break;
      
    case 'ADD_LOG':
      // Allow logging to extension storage without auth
      chrome.storage.sync.get(['logs'], (result) => {
        const logs = result.logs || []
        const newLog = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          message: request.message,
          type: request.logType || 'info',
          category: request.category || 'system'
        }
        logs.unshift(newLog)
        const trimmedLogs = logs.slice(0, 100)
        chrome.storage.sync.set({ logs: trimmedLogs }, () => {
          sendResponse({ success: true })
        })
      })
      break;

    case 'CLEAR_LOGS':
      chrome.storage.sync.set({ logs: [] }, () => {
        sendResponse({ success: true });
      });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
}