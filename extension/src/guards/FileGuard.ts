import { BackendApiService } from '../services/BackendApiService'
import type { ThreatAnalysis } from '~utils/threatDetector'

export interface EnhancedScanResult {
  isMalicious: boolean
  detectionCount: number
  totalEngines: number
  success: boolean
  error?: string
  scanType?:  'backend-scan'
  virusTotalResult?: {
    isMalicious: boolean
    detectionCount: number
    totalEngines: number
    success: boolean
    error?: string
  } | null
  promptInjectionResult?: ThreatAnalysis | null
  scanDetails?: string
  threats?: string[]
  riskLevel?: 'safe' | 'low' | 'medium' | 'high'
  
  // Backend-specific properties
  shouldBlock?: boolean
  blockReason?: string
  isSensitiveFile?: boolean
  isMaliciousFile?: boolean
  piiDetection?: {
    hasPII: boolean
    patterns: string[]
    riskLevel: string
    count: number
  } | null
  fileSize?: number
  fileHash?: string
}

export class FileGuard {
  private isEnabled = true

  async handleFileUpload(files: FileList, source: string): Promise<boolean> {
    console.log('🔍 REAL_FILE_UPLOAD: Starting file upload handling...')
    console.log('🔍 REAL_FILE_UPLOAD: Files count:', files.length)
    console.log('🔍 REAL_FILE_UPLOAD: Source:', source)
    console.log('🔍 REAL_FILE_UPLOAD: FileGuard enabled:', this.isEnabled)
    
    if (!this.isEnabled) {
      console.log('⏸️ REAL_FILE_UPLOAD: FileGuard disabled, allowing upload')
      return true
    }

    const config = await this.getConfig()
    console.log('🔍 REAL_FILE_UPLOAD: Config loaded:', config)
    const scanResults: EnhancedScanResult[] = []
    
    for (const file of Array.from(files)) {
      console.log('🔍 REAL_FILE_UPLOAD: Processing file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      })
      
      const result = await this.processFile(file, config, scanResults)
      console.log('🔍 REAL_FILE_UPLOAD: File processing result:', result)
      
      if (!result) {
        console.log('❌ REAL_FILE_UPLOAD: File blocked, stopping processing')
        return false
      }
    }

    if (files.length > 0) {
      console.log('✅ REAL_FILE_UPLOAD: All files passed, showing success notification')
      this.showNotification(`✅ ${files.length} file(s) passed security scan and cleared for upload`, 'success')
      await this.logFileUploadSuccess(files, scanResults)
    }

    console.log('✅ REAL_FILE_UPLOAD: Upload handling completed successfully')
    return true
  }

  private async processFile(file: File, config: any, scanResults: EnhancedScanResult[]): Promise<boolean> {
    console.log('🔍 REAL_FILE_PROCESS: Starting file processing...')
    console.log('🔍 REAL_FILE_PROCESS: File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    })
    
    // Perform comprehensive file scan via backend
    console.log('🔍 REAL_FILE_PROCESS: Calling scanFile...')
    const scanResult = await this.scanFile(file)
    console.log('🔍 REAL_FILE_PROCESS: Scan result received:', scanResult)
    scanResults.push(scanResult)
    
    if (!scanResult.success) {
      console.log('❌ REAL_FILE_PROCESS: Scan failed:', scanResult.error)
      this.showNotification(
        `🚫 Upload blocked: ${file.name} - Security scan failed  : ${scanResult.error}`,
        'error'
      )
      await this.logFileBlocked(file.name, `Scan failed: ${scanResult.error}`, scanResult)
      return false
    }

    // Check if file should be blocked based on backend analysis
    if (scanResult.shouldBlock) {
      const blockReason = scanResult.blockReason || 'Security threat detected'
      console.log('❌ REAL_FILE_PROCESS: File blocked by backend:', blockReason)
      this.showNotification(
        `🚫 Upload blocked: ${file.name} - ${blockReason}`,
        'error'
      )
      await this.logFileBlocked(file.name, blockReason, scanResult)
      return false
    }

    // File passed all backend security checks
    console.log('✅ REAL_FILE_PROCESS: File passed all security checks')
    return true
  }

  private async scanFile(file: File): Promise<EnhancedScanResult> {
    console.log('🔍 REAL_FILE_SCAN: Starting file scan...')
    console.log('🔍 REAL_FILE_SCAN: File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeMB: (file.size / (1024 * 1024)).toFixed(2)
    })
    
    try {
      const fileSizeMB = file.size / (1024 * 1024)
      
      if (fileSizeMB > 32) {
        console.log('❌ REAL_FILE_SCAN: File too large:', fileSizeMB, 'MB')
        return {
          isMalicious: false,
          detectionCount: 0,
          totalEngines: 0,
          success: false,
          error: `File too large (${fileSizeMB.toFixed(2)}MB) - Maximum file size is 32MB`,
          shouldBlock: true,
          blockReason: `File too large (${fileSizeMB.toFixed(2)}MB)`
        }
      }

      console.log('🔍 REAL_FILE_SCAN: Getting BackendApiService instance...')
      const backendApi = BackendApiService.getInstance()

      try {
        console.log('🔍 REAL_FILE_SCAN: Extracting file text...')
        let fileText: string | undefined
        try {
          fileText = await file.text()
          console.log('🔍 REAL_FILE_SCAN: File text extracted, length:', fileText?.length || 0)
        } catch (e) {
          console.log('⚠️ REAL_FILE_SCAN: Could not extract text from file:', e)
          fileText = undefined
        }

        console.log('🔍 REAL_FILE_SCAN: Converting file to ArrayBuffer for background script...')
        
        // Convert file to ArrayBuffer (same as test file scan)
        const arrayBuffer = await file.arrayBuffer()
        const fileData = Array.from(new Uint8Array(arrayBuffer))
        
        console.log('🔍 REAL_FILE_SCAN: File converted, sending to background script...')
        console.log('🔍 REAL_FILE_SCAN: File details:', {
          name: file.name,
          size: file.size,
          type: file.type,
          arrayBufferSize: arrayBuffer.byteLength,
          arrayLength: fileData.length
        })
        
        // Use the same path as test file scan - send to background script
        const backendResult:EnhancedScanResult = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            type: 'SCAN_FILE',
            fileName: file.name,
            fileData: fileData
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('❌ REAL_FILE_SCAN: Chrome runtime error:', chrome.runtime.lastError)
              reject(new Error(chrome.runtime.lastError.message))
            } else {
              console.log('🔍 REAL_FILE_SCAN: Background script response:', response)
              resolve(response)
            }
          })
        })
        
        console.log('🔍 REAL_FILE_SCAN: Background script result received:', backendResult)
        
        if (backendResult) {
          console.log('✅ REAL_FILE_SCAN: Background script scan successful')
          return {
            isMalicious: backendResult.isMalicious || false,
            detectionCount: backendResult.detectionCount || 0,
            totalEngines: backendResult.totalEngines || 0,
            success: backendResult.success || false,
            error: backendResult.error || undefined,
            scanType: 'backend-scan',
            threats: backendResult.threats || [],
            riskLevel: backendResult.riskLevel || 'safe',
            shouldBlock: backendResult.shouldBlock || false,
            blockReason: backendResult.blockReason || undefined,
            isSensitiveFile: backendResult.isSensitiveFile || false,
            isMaliciousFile: backendResult.isMaliciousFile || false,
            piiDetection: backendResult.piiDetection || null,
            fileSize: backendResult.fileSize || file.size,
            fileHash: backendResult.fileHash || undefined
          }
        } else {
          console.log('❌ REAL_FILE_SCAN: Background script returned null result')
          return {
            isMalicious: false,
            detectionCount: 0,
            totalEngines: 0,
            success: false,
            shouldBlock: true,
            blockReason: 'Background script scan failed'
          }
        }
      } catch (backendError) {
        console.log('❌ REAL_FILE_SCAN: Background script scan error:', backendError)
        return {
          isMalicious: false,
          detectionCount: 0,
          totalEngines: 0,
          success: false,
          error: `Background script scan failed: ${backendError instanceof Error ? backendError.message : 'Unknown error'}`,
          shouldBlock: true,
          blockReason: 'Background script scan failed'
        }
      }
    } catch (error) {
      console.log('❌ REAL_FILE_SCAN: General scan error:', error)
      return {
        isMalicious: false,
        detectionCount: 0,
        totalEngines: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        shouldBlock: true,
        blockReason: 'Scan failed'
      }
    }
  }

  private buildThreatDetails(scanResult: EnhancedScanResult): string {
    const details: string[] = []

    // Backend-provided threat details
    if (scanResult.blockReason) {
      details.push(scanResult.blockReason)
    }

    if (scanResult.isMalicious) {
      details.push(`Malware detected by ${scanResult.detectionCount}/${scanResult.totalEngines} engines`)
    }

    if (scanResult.isSensitiveFile) {
      details.push('Sensitive file detected')
    }

    if (scanResult.isMaliciousFile) {
      details.push('Potentially dangerous file type')
    }

    if (scanResult.piiDetection?.hasPII) {
      details.push(`PII detected (${scanResult.piiDetection.count} patterns)`)
    }

    if (scanResult.threats && scanResult.threats.length > 0) {
      details.push(`Threats: ${scanResult.threats.join(', ')}`)
    }

    return details.length > 0 ? details.join(' | ') : 'Security threats detected'
  }

  private async getConfig(): Promise<any> {
    try {
      return await chrome.runtime.sendMessage({ type: 'GET_CONFIG' })
    } catch (error) {
      return null
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    console.log(`${type.toUpperCase()}: ${message}`)
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  private async logFileBlocked(fileName: string, reason: string, scanResult?: EnhancedScanResult): Promise<void> {
    try {
      const message = `🚫 BLOCKED FILE - ${reason}`
      let logMessage = `${message}\n\n📁 FILE NAME: ${fileName}`
      
      if (scanResult) {
        logMessage += `\n\n🔍 SCAN RESULTS:`
        logMessage += `\n   • Risk Level: ${scanResult.riskLevel || 'unknown'}`
        logMessage += `\n   • Success: ${scanResult.success ? 'Yes' : 'No'}`
        
        if (scanResult.isMalicious) {
          logMessage += `\n   • Malware: ${scanResult.detectionCount}/${scanResult.totalEngines} engines`
        }
        
        if (scanResult.isSensitiveFile) {
          logMessage += `\n   • Sensitive File: Yes`
        }
        
        if (scanResult.isMaliciousFile) {
          logMessage += `\n   • Malicious File Type: Yes`
        }
        
        if (scanResult.piiDetection?.hasPII) {
          logMessage += `\n   • PII Detected: ${scanResult.piiDetection.count} patterns`
        }
        
        if (scanResult.threats && scanResult.threats.length > 0) {
          logMessage += `\n   • Threats: ${scanResult.threats.join(', ')}`
        }
        
        if (scanResult.fileHash) {
          logMessage += `\n   • File Hash: ${scanResult.fileHash}`
        }
        
        if (scanResult.fileSize) {
          logMessage += `\n   • File Size: ${(scanResult.fileSize / 1024 / 1024).toFixed(2)}MB`
        }
      }
      
      console.log('🔍 REAL_FILE_LOG: Sending blocked file log to extension...')
      console.log('🔍 REAL_FILE_LOG: Log message:', logMessage)
      
      await chrome.runtime.sendMessage({
        type: 'ADD_LOG',
        message: logMessage,
        logType: 'error',
        category: 'file_scan'
      })
      
      console.log('✅ REAL_FILE_LOG: Blocked file log sent successfully')
      
      // Log to backend if available
      const backendApi = BackendApiService.getInstance()
      if (backendApi.isEnabled()) {
        await backendApi.logAuditEvent({
          type: 'file_blocked',
          message: `File blocked: ${fileName} - ${reason}`,
          severity: 'high',
          data: {
            fileName,
            reason,
            scanResult: scanResult ? {
              riskLevel: scanResult.riskLevel,
              isMalicious: scanResult.isMalicious,
              isSensitiveFile: scanResult.isSensitiveFile,
              isMaliciousFile: scanResult.isMaliciousFile,
              piiDetection: scanResult.piiDetection,
              threats: scanResult.threats,
              fileHash: scanResult.fileHash,
              fileSize: scanResult.fileSize
            } : null
          }
        })
      }
    } catch (error) {
      console.error('❌ REAL_FILE_LOG: Could not log file block to extension:', error)
      console.error('❌ REAL_FILE_LOG: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    }
  }

  private async logFileUploadSuccess(files: FileList, scanResults?: EnhancedScanResult[]): Promise<void> {
    try {
      const fileNames = Array.from(files).map(f => f.name).join(', ')
      const message = `✅ ALLOWED FILE UPLOAD - Security scan passed`
      let logMessage = `${message}\n\n📁 FILES: ${fileNames}`
      
      if (scanResults && scanResults.length > 0) {
        logMessage += `\n\n🔍 SCAN RESULTS:`
        scanResults.forEach((result, index) => {
          const fileName = fileNames.split(', ')[index] || `File ${index + 1}`
          logMessage += `\n📄 ${fileName}:`
          logMessage += `\n   • Risk Level: ${result.riskLevel || 'safe'}`
          logMessage += `\n   • Backend Scan: ${result.success ? 'Success' : 'Failed'}`
          
          if (result.isMalicious) {
            logMessage += `\n   • Malware: ${result.detectionCount}/${result.totalEngines} engines`
          }
          
          if (result.isSensitiveFile) {
            logMessage += `\n   • Sensitive File: Yes`
          }
          
          if (result.isMaliciousFile) {
            logMessage += `\n   • Malicious File Type: Yes`
          }
          
          if (result.piiDetection?.hasPII) {
            logMessage += `\n   • PII Detected: ${result.piiDetection.count} patterns`
          }
          
          if (result.fileHash) {
            logMessage += `\n   • File Hash: ${result.fileHash}`
          }
        })
      }
      
      console.log('🔍 REAL_FILE_LOG: Sending success file log to extension...')
      console.log('🔍 REAL_FILE_LOG: Log message:', logMessage)
        
      await chrome.runtime.sendMessage({
        type: 'ADD_LOG',
        message: logMessage,
        logType: 'success',
        category: 'file_scan'
      })
      
      console.log('✅ REAL_FILE_LOG: Success file log sent successfully')
      
      // Log to backend if available
      const backendApi = BackendApiService.getInstance()
      if (backendApi.isEnabled()) {
        await backendApi.logAuditEvent({
          type: 'file_allowed',
          message: `Files allowed: ${fileNames}`,
          severity: 'info',
          data: {
            fileNames: fileNames.split(', '),
            scanResults: scanResults?.map(result => ({
              riskLevel: result.riskLevel,
              isMalicious: result.isMalicious,
              isSensitiveFile: result.isSensitiveFile,
              isMaliciousFile: result.isMaliciousFile,
              piiDetection: result.piiDetection,
              fileHash: result.fileHash
            })) || []
          }
        })
      }
    } catch (error) {
      console.error('❌ REAL_FILE_LOG: Could not log file upload success to extension:', error)
      console.error('❌ REAL_FILE_LOG: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    }
  }
}