export {}

import { FastThreatDetector } from '../utils/threatDetector'

const VIRUSTOTAL_API_BASE = 'https://www.virustotal.com/api/v3'

chrome.runtime.onInstalled.addListener(async () => {
  console.log('File Upload Scanner extension installed');
  
  chrome.storage.sync.set({
    config: {
      isEnabled: true,
      apiKey: '',
      geminiApiKey: '',
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
    const fileHash = await calculateFileHash(fileData)
    console.log(`Calculated file hash: ${fileHash}`)

    const existingReport = await getFileReport(fileHash, apiKey)
    
    if (existingReport && existingReport.last_analysis_stats) {
      console.log('Found existing VirusTotal report')
      const stats = existingReport.last_analysis_stats
      const detectionCount = (stats.malicious || 0) + (stats.suspicious || 0)
      const totalEngines = Object.values(stats).reduce((sum: number, count: unknown) => sum + (Number(count) || 0), 0) as number
      
      return {
        isMalicious: detectionCount > 0,
        detectionCount,
        totalEngines,
        success: true,
        scanId: fileHash
      }
    }
    
    console.log('No existing report found, uploading file for analysis...')
    
    const analysisId = await uploadFileToVirusTotal(fileData, fileName, apiKey)
    
    if (!analysisId) {
      throw new Error('Failed to upload file to VirusTotal')
    }
    
    console.log(`File uploaded, analysis ID: ${analysisId}`)
    
    const analysisResult = await getFileAnalysis(analysisId, apiKey)
    
    if (analysisResult.stats) {
      const stats = analysisResult.stats
      const detectionCount = (stats.malicious || 0) + (stats.suspicious || 0)
      const totalEngines = Object.values(stats).reduce((sum: number, count: unknown) => sum + (Number(count) || 0), 0) as number
      
      return {
        isMalicious: detectionCount > 0,
        detectionCount,
        totalEngines,
        success: true,
        scanId: analysisId
      }
    }
    
    throw new Error('Invalid analysis result format')
    
  } catch (error) {
    console.error('VirusTotal scan error:', error)
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
      url: ['https://chatgpt.com/*', 'https://chat.openai.com/*']
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background: Received message:', request.type, 'from', sender.tab?.url || 'extension')
  
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
      chrome.storage.sync.set({ config: request.config }, async () => {
        await broadcastStatusChange(request.config.isEnabled);
        sendResponse({ success: true });
      });
      break;
      
    case 'SCAN_FILE':
      (async () => {
        try {
          const { config } = await chrome.storage.sync.get(['config'])
          
          if (!config || !config.isEnabled) {
            sendResponse({ 
              success: false, 
              error: 'Scanner is disabled',
              isMalicious: false,
              detectionCount: 0,
              totalEngines: 0
            })
            return
          }
          
          let fileData: ArrayBuffer
          if (Array.isArray(request.fileData)) {
            fileData = new Uint8Array(request.fileData).buffer
          } else if (request.fileData instanceof ArrayBuffer) {
            fileData = request.fileData
          } else {
            throw new Error('Invalid file data format')
          }
          
          
          let virusTotalResult = null
          let promptInjectionResult = null
          let usedFallback = false
          
          if (config.apiKey) {
            console.log('🛡️ Running VirusTotal PRIMARY malware scan...')
            virusTotalResult = await scanFileWithVirusTotal(
              fileData,
              request.fileName,
              config.apiKey
            )
          }
          
          console.log('🚫 Local LLM: Skipping file analysis - LLM is reserved for prompt injection protection only')
          
          if (!virusTotalResult?.success) {
            console.log('⚠️ VirusTotal failed - No fallback available (LLM reserved for prompt injection only)')
          }
          
          const virusTotalThreat = virusTotalResult?.success && virusTotalResult?.isMalicious
          
          const isMalicious = virusTotalThreat
          
          let scanDetails = []
          if (virusTotalResult?.success) {
            scanDetails.push(`VirusTotal (PRIMARY): ${virusTotalResult.isMalicious ? 'THREAT' : 'CLEAN'} (${virusTotalResult.detectionCount}/${virusTotalResult.totalEngines})`)
          } else if (virusTotalResult) {
            scanDetails.push(`VirusTotal (PRIMARY): FAILED - ${virusTotalResult.error}`)
          }
          
          if (config.geminiApiKey) {
            scanDetails.push('Gemini API: RESERVED for prompt injection protection (not file scanning)')
          } else {
            scanDetails.push('Gemini API: DISABLED (No API key)')
          }
          
          if (!config.apiKey) {
            scanDetails.push('VirusTotal: DISABLED (No API key)')
          }
          
          sendResponse({
            success: true,
            isMalicious,
            detectionCount: virusTotalResult?.detectionCount || 0,
            totalEngines: virusTotalResult?.totalEngines || 0,
            scanType: 'virustotal-only',
            virusTotalResult: virusTotalResult || null,
            promptInjectionResult: null,
            scanDetails: scanDetails.join(' | '),
            threats: [],
            riskLevel: 'safe'
          })
          return
          
          if (!virusTotalResult && config.apiKey) {
            console.log('🛡️ Fallback: Using VirusTotal only for threat detection...')
            
            const result = await scanFileWithVirusTotal(
              fileData,
              request.fileName,
              config.apiKey
            )
            
            sendResponse({ ...result, scanType: 'virustotal-fallback' })
            return
          }
          
          if (!virusTotalResult && !promptInjectionResult) {
            sendResponse({ 
              success: false, 
              error: 'No scanning methods available (VirusTotal API key missing and Gemini API not ready)',
              isMalicious: false,
              detectionCount: 0,
              totalEngines: 0
            })
            return
          }
          
        } catch (error) {
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
            logType: 'info'
          })
          
          const result = await FastThreatDetector.analyzeContent(prompt, geminiApiKey)
          console.log('🔍 Gemini prompt injection test result:', result)
          
          if (result.isThreats) {
            chrome.runtime.sendMessage({
              type: 'ADD_LOG',
              message: `🚨 INJECTION DETECTED: ${result.riskLevel.toUpperCase()} risk - ${result.summary}`,
              logType: 'error'
            })
            
            for (const threat of result.threats) {
              chrome.runtime.sendMessage({
                type: 'ADD_LOG',
                message: `⚠️ THREAT TYPE: ${threat}`,
                logType: 'warning'
              })
            }
            
            chrome.runtime.sendMessage({
              type: 'ADD_LOG',
              message: `🚫 BLOCKED: "${prompt.substring(0, 200)}${prompt.length > 200 ? '...' : ''}"`,
              logType: 'error'
            })
          } else {
            chrome.runtime.sendMessage({
              type: 'ADD_LOG',
              message: `✅ SAFE PROMPT: ${result.summary}`,
              logType: 'success'
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
      chrome.storage.sync.get(['logs'], (result) => {
        const logs = result.logs || [];
        const newLog = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          message: request.message,
          type: request.logType || 'info'
        };
        logs.unshift(newLog);
        const trimmedLogs = logs.slice(0, 100);
        
        console.log('Background: Adding log:', newLog);
        console.log('Background: Total logs:', trimmedLogs.length);
        
        chrome.storage.sync.set({ logs: trimmedLogs }, () => {
          console.log('Background: Log saved to storage');
          sendResponse({ success: true });
        });
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
  
  return true;
});