

import { FastThreatDetector } from '../utils/threatDetector'

const VIRUSTOTAL_API_BASE = 'https://www.virustotal.com/api/v3'

chrome.runtime.onInstalled.addListener(async () => {
  console.log('File Upload Scanner extension installed');
  
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
      {
        id: '1',
        timestamp: new Date().toISOString(),
        message: 'File Upload Scanner initialized successfully by Aaditya Raj',
        type: 'info'
      }
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
  console.log('Background: Received message:', request.type, 'from', sender.tab?.url || 'extension')
  
  // Authentication check for sensitive operations
  const requiresAuth = ['SCAN_FILE', 'TEST_PROMPT_INJECTION', 'ADD_LOG'].includes(request.type)
  
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
    case 'SCAN_FILE':
      (async () => {
        try {
          console.log('🔍 SCAN_FILE: Starting file scan process...')
          console.log('🔍 SCAN_FILE: Request details:', {
            fileName: request.fileName,
            fileSize: request.fileData ? (Array.isArray(request.fileData) ? request.fileData.length : request.fileData.byteLength) : 'unknown',
            fileDataType: Array.isArray(request.fileData) ? 'array' : typeof request.fileData
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
          
          // Send file to backend for scanning
          const formData = new FormData()
          const blob = new Blob([fileData], { type: 'text/plain' }) // Add MIME type
          formData.append('file', blob, request.fileName)
          
          // Debug FormData contents
          console.log('🔍 SCAN_FILE: FormData details:', {
            fileName: request.fileName,
            blobSize: blob.size,
            blobType: blob.type,
            formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
              key,
              valueType: typeof value,
              valueSize: value instanceof Blob ? value.size : 'N/A',
              valueName: value instanceof File ? value.name : 'N/A'
            }))
          })
          
          const headers: Record<string, string> = {}
          
          // Get auth token from authUser storage
          const authResult = await chrome.storage.sync.get(['authUser'])
          if (authResult.authUser && authResult.authUser.token) {
            headers['Authorization'] = `Bearer ${authResult.authUser.token}`
            console.log('🔐 SCAN_FILE: Using auth token for request')
          } else {
            console.log('❌ SCAN_FILE: No auth token found, request will fail authentication')
          }
          
          console.log('🚀 SCAN_FILE: Sending to backend:', {
            url: `${config.backendConfig.apiUrl}/api/v1/scan/file`,
            fileName: request.fileName,
            fileSize: fileData.byteLength,
            hasAuthToken: !!(authResult.authUser && authResult.authUser.token),
            headers: headers
          })

          const response = await fetch(`${config.backendConfig.apiUrl}/api/v1/scan/file`, {
            method: 'POST',
            headers: headers,
            body: formData
          })
          
          console.log('📡 SCAN_FILE: Backend response status:', response.status)
          console.log('📡 SCAN_FILE: Backend response headers:', Object.fromEntries(response.headers.entries()))
          
          if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ SCAN_FILE: Backend scan failed:', response.status, errorText)
            throw new Error(`Backend scan failed: ${response.status} ${response.statusText}`)
          }
          
          const scanResult = await response.json()
          console.log('✅ SCAN_FILE: Backend scan completed:', scanResult)
          
        
          
          sendResponse(scanResult)
          return
          
        } catch (error) {
          console.error('❌ SCAN_FILE: Error during backend scan:', error)
          sendResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            isMalicious: false,
            detectionCount: 0,
            totalEngines: 0
          })
        }
      })()
      break;
      
    case 'TEST_PROMPT_INJECTION':
      (async () => {
        try {
          const { prompt } = request
          
          if (!prompt || typeof prompt !== 'string') {
            sendResponse({
              success: false,
              error: 'Invalid prompt provided',
              isThreats: false,
              threats: [],
              riskLevel: 'safe'
            })
            return
          }
          
          const { config } = await chrome.storage.sync.get(['config'])
          console.log('🔍 Config retrieved for TEST_PROMPT_INJECTION:', {
            configExists: !!config,
            geminiApiKeyExists: !!(config?.geminiApiKey),
            geminiApiKeyLength: config?.geminiApiKey?.length || 0
          })
          
          const geminiApiKey = config?.geminiApiKey
          
          if (!geminiApiKey || geminiApiKey.trim() === '') {
            console.log('❌ No Gemini API key found in config')
            sendResponse({
              success: false,
              error: 'Gemini API key not configured. Please add your Gemini API key in the extension settings.',
              isThreats: false,
              threats: [],
              riskLevel: 'safe'
            })
            return
          }
          
          console.log('🤖 Testing prompt for injection attacks with Gemini:', prompt.substring(0, 50) + '...')
          console.log('🔑 Using Gemini API key (length:', geminiApiKey.length, ')')
          
          chrome.runtime.sendMessage({
            type: 'ADD_LOG',
            message: `🔍 ANALYZING PROMPT: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`,
            logType: 'info',
            category: 'prompt_injection'
          })
          
          const result = await FastThreatDetector.analyzeContent(prompt, geminiApiKey)
          console.log('🔍 Gemini prompt injection test result:', result)
          
          if (result.isThreats) {
            chrome.runtime.sendMessage({
              type: 'ADD_LOG',
              message: `🚨 INJECTION DETECTED: ${result.riskLevel.toUpperCase()} risk - ${result.summary}`,
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
              message: `✅ SAFE PROMPT: ${result.summary}`,
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
            scanType: 'gemini-prompt-injection-test'
          })
          
        } catch (error) {
          console.error('❌ Error testing prompt injection with Gemini:', error)
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            isThreats: false,
            threats: [],
            riskLevel: 'safe'
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
          // Hourly throttle by category+message
          const throttleKey = `audit_throttle_${(request.category || 'system')}_${request.message}`
          const nowTs = Date.now()
          const lastSentStr = localStorage.getItem(throttleKey)
          const lastSent = lastSentStr ? parseInt(lastSentStr, 10) : 0
          const oneHourMs = 3600000
          if (lastSent && nowTs - lastSent < oneHourMs) {
            console.log('⏸️ ADD_LOG: Skipping backend audit due to hourly throttle:', throttleKey)
            return
          }
          localStorage.setItem(throttleKey, String(nowTs))

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
      
    case 'CLEAR_LOGS':
      chrome.storage.sync.set({ logs: [] }, () => {
        sendResponse({ success: true });
      });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
}