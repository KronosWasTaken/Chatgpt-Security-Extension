import { PatternMatcher } from '../core/PatternMatcher'
import type { ThreatAnalysis } from '~utils/threatDetector'

export interface EnhancedScanResult {
  isMalicious: boolean
  detectionCount: number
  totalEngines: number
  success: boolean
  error?: string
  scanType?: 'hybrid' | 'local-ai' | 'virustotal' | 'virustotal-fallback'
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
}

export class FileGuard {
  private isEnabled = true

  async handleFileUpload(files: FileList, source: string): Promise<boolean> {
    if (!this.isEnabled) {
      return true
    }

    const config = await this.getConfig()
    
    for (const file of Array.from(files)) {
      const result = await this.processFile(file, config)
      if (!result) {
        return false
      }
    }

    if (files.length > 0) {
      this.showNotification(`✅ ${files.length} file(s) passed security scan and cleared for upload`, 'success')
    }

    return true
  }

  private async processFile(file: File, config: any): Promise<boolean> {
    if (PatternMatcher.isSensitiveFile(file.name)) {
      this.showNotification(
        `🚫 Upload blocked: ${file.name} contains sensitive data that could leak secrets`,
        'error'
      )
      return false
    }

    if (PatternMatcher.isMaliciousFile(file.name)) {
      if (!config?.advancedSettings?.scanExecutables) {
        this.showNotification(
          `🚫 Upload blocked: ${file.name} is a potentially dangerous executable file`,
          'error'
        )
        return false
      }
    }

    if (file.size > 32 * 1024 * 1024) {
      this.showNotification(
        `🚫 Upload blocked: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) - File too large for security scanning`,
        'error'
      )
      return false
    }

    const scanResult = await this.scanFile(file)
    
    if (!scanResult.success) {
      this.showNotification(
        `🚫 Upload blocked: ${file.name} - Security scan failed: ${scanResult.error}`,
        'error'
      )
      return false
    }

    if (scanResult.isMalicious) {
      const threatDetails = this.buildThreatDetails(scanResult)
      this.showNotification(
        `🦠 Upload blocked: ${file.name} - ${threatDetails}`,
        'error'
      )
      return false
    }

    return true
  }

  private async scanFile(file: File): Promise<EnhancedScanResult> {
    try {
      const fileSizeMB = file.size / (1024 * 1024)
      
      if (fileSizeMB > 32) {
        return {
          isMalicious: false,
          detectionCount: 0,
          totalEngines: 0,
          success: false,
          error: `File too large (${fileSizeMB.toFixed(2)}MB) - Chrome extension cannot handle files over 32MB`
        }
      }

      const fileData = await file.arrayBuffer()
      
      if (!(fileData instanceof ArrayBuffer)) {
        throw new Error('Failed to read file as ArrayBuffer')
      }

      const response = await chrome.runtime.sendMessage({
        type: 'SCAN_FILE',
        fileName: file.name,
        fileData: Array.from(new Uint8Array(fileData))
      })

      return response
    } catch (error) {
      if (error instanceof Error && error.message.includes('Message length exceeded')) {
        return {
          isMalicious: false,
          detectionCount: 0,
          totalEngines: 0,
          success: false,
          error: 'File too large - Chrome extension cannot handle this file size'
        }
      }

      return {
        isMalicious: false,
        detectionCount: 0,
        totalEngines: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private buildThreatDetails(scanResult: EnhancedScanResult): string {
    const details: string[] = []

    if (scanResult.virusTotalResult?.isMalicious) {
      details.push(
        `Malware detected by ${scanResult.virusTotalResult.detectionCount}/${scanResult.virusTotalResult.totalEngines} engines`
      )
    }

    if (scanResult.promptInjectionResult?.isThreats) {
      details.push(
        `Prompt injection attack detected (${scanResult.promptInjectionResult.riskLevel} risk)`
      )
      
      if (scanResult.threats?.length) {
        details.push(`Threats: ${scanResult.threats.join(', ')}`)
      }
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
}