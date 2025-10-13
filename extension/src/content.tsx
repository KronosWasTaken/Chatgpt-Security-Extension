import type { PlasmoCSConfig } from "plasmo"
import { SecurityManager } from './SecurityManager'

export const config: PlasmoCSConfig = {
  matches: [
    "https://chatgpt.com/*", 
"https://gemini.google.com//*", 
    "https://chat.openai.com/*", 
    "http://127.0.0.1:*/*", 
    "http://localhost:*/*", 
    "file://*/*"
  ],
  all_frames: true,
  run_at: "document_start"
}

export default null

class ContentScript {
  private securityManager: SecurityManager
  private isInitialized = false
  private isEnabled = true
  private isAuthenticated = false

  constructor() {
    try {
      console.log('🚀 ContentScript: Starting initialization...')
      console.log('🚀 ContentScript: Current URL:', window.location.href)
      console.log('🚀 ContentScript: Document ready state:', document.readyState)
      console.log('🚀 ContentScript: Chrome runtime available:', !!chrome?.runtime)
      
      this.securityManager = new SecurityManager()
      this.setupMessageListener()
      this.checkAuthenticationAndInitialize()
    } catch (error) {
      console.error('🚨 ContentScript constructor failed:', error)
      this.logError('ContentScript constructor failed', error)
    }
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('📨 ContentScript received message:', request.type)
      
      switch (request.type) {
        case 'STATUS_CHANGED':
          this.handleStatusChange(request.isEnabled)
          sendResponse({ success: true })
          break
        case 'AUTH_STATUS_CHANGED':
          this.handleAuthStatusChange(request.isAuthenticated)
          sendResponse({ success: true })
          break
        case 'GET_STATUS':
          sendResponse({
            isEnabled: this.isEnabled,
            isInitialized: this.isInitialized,
            isAuthenticated: this.isAuthenticated,
            status: this.securityManager.getStatus()
          })
          break
        default:
          break
      }
      
      return true
    })
  }

  private async checkAuthenticationAndInitialize(): Promise<void> {
    try {
      console.log('🔐 ContentScript: Checking authentication status...')
      
      // Check authentication status from storage
      const result = await chrome.storage.sync.get(['authUser'])
      const isAuthenticated = result.authUser && result.authUser.token
      
      console.log('🔐 ContentScript: Authentication status:', isAuthenticated)
      this.isAuthenticated = isAuthenticated
      
      if (isAuthenticated) {
        console.log('🔐 ContentScript: User authenticated, proceeding with initialization')
        await this.initialize()
      } else {
        console.log('🔐 ContentScript: User not authenticated, disabling security features')
        await this.disableSecurity()
        await this.logError('Security features disabled - user not authenticated', null)
      }
    } catch (error) {
      console.error('🔐 ContentScript: Authentication check failed:', error)
      await this.logError('Authentication check failed', error)
      await this.disableSecurity()
    }
  }

  private async handleAuthStatusChange(isAuthenticated: boolean): Promise<void> {
    console.log(`🔐 ContentScript: Auth status changed to ${isAuthenticated ? 'AUTHENTICATED' : 'NOT AUTHENTICATED'}`)
    
    this.isAuthenticated = isAuthenticated
    
    if (isAuthenticated) {
      console.log('🔐 ContentScript: User authenticated, enabling security features')
      await this.enableSecurity()
    } else {
      console.log('🔐 ContentScript: User not authenticated, disabling security features')
      await this.disableSecurity()
    }
    
    await this.logSuccess(`Security scanner ${isAuthenticated ? 'ENABLED' : 'DISABLED'} - Authentication ${isAuthenticated ? 'GRANTED' : 'REQUIRED'}`)
  }

  private async handleStatusChange(isEnabled: boolean): Promise<void> {
    console.log(`🔄 ContentScript: Status changed to ${isEnabled ? 'ENABLED' : 'DISABLED'}`)
    
    this.isEnabled = isEnabled
    
    // Only enable security if both enabled AND authenticated
    if (isEnabled && this.isAuthenticated) {
      console.log('🔄 ContentScript: Both enabled and authenticated, enabling security')
      await this.enableSecurity()
    } else {
      console.log('🔄 ContentScript: Disabling security (enabled:', isEnabled, ', authenticated:', this.isAuthenticated, ')')
      await this.disableSecurity()
    }
    
    // Log the status change
    await this.logSuccess(`Security scanner ${isEnabled ? 'ENABLED' : 'DISABLED'} on ${window.location.href}`)
  }

  private async enableSecurity(): Promise<void> {
    try {
      console.log('🛡️ Enabling security features...')
      
      // Double-check authentication before enabling
      if (!this.isAuthenticated) {
        console.log('🔐 Security enable blocked - user not authenticated')
        await this.logError('Security features blocked - authentication required', null)
        return
      }
      
      // Re-initialize security manager if needed
      if (!this.isInitialized) {
        await this.securityManager.initialize()
        this.isInitialized = true
      }
      
      // Enable all security components
      this.securityManager.setEnabled(true)
      
      console.log('✅ Security features enabled')
    } catch (error) {
      console.error('🚨 Failed to enable security:', error)
      this.logError('Failed to enable security', error)
    }
  }

  private async disableSecurity(): Promise<void> {
    try {
      console.log('⚪ Disabling security features...')
      
      // Disable all security components
      this.securityManager.setEnabled(false)
      
      console.log('✅ Security features disabled')
    } catch (error) {
      console.error('🚨 Failed to disable security:', error)
      this.logError('Failed to disable security', error)
    }
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ ContentScript already initialized, skipping...')
      return
    }

    try {
      console.log('🔄 ContentScript: Initializing...')
      
      if (document.readyState === 'loading') {
        console.log('🕇 DOM loading, waiting for DOMContentLoaded...')
        document.addEventListener('DOMContentLoaded', () => this.startSecurity())
      } else {
        console.log('✅ DOM ready, starting security immediately...')
        this.startSecurity()
      }

      this.isInitialized = true
      console.log('✅ ContentScript initialization complete')
    } catch (error) {
      console.error('🚨 ContentScript initialization failed:', error)
      this.logError('ContentScript initialization failed', error)
    }
  }

  private async startSecurity(): Promise<void> {
    try {
      console.log('🛡️ Starting SecurityManager...')
      await this.securityManager.initialize()
      console.log('✅ Security Manager initialized successfully')
      
      await this.logSuccess('Security Manager initialized on: ' + window.location.href)
      await this.testLogging()
    } catch (error) {
      console.error('🚨 SecurityManager initialization failed:', error)
      this.logError('SecurityManager initialization failed', error)
    }
  }

  private async logSuccess(message: string): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'ADD_LOG',
        message,
        logType: 'info',
        category: 'system'
      })
    } catch (error) {
      console.warn('Could not log to extension:', error)
    }
  }

  private async testLogging(): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'ADD_LOG',
        message: '🧪 TEST LOG from localhost - File scan logging test',
        logType: 'info',
        category: 'file_scan'
      })
    } catch (error) {
      console.warn('Could not send test log:', error)
    }
  }

  private async logError(message: string, error: any): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'ADD_LOG',
        message: `${message}: ${error?.message || error}`,
        logType: 'error',
        category: 'system'
      })
    } catch (logError) {
      console.warn('Could not log error to extension:', logError)
    }
  }

  cleanup(): void {
    try {
      if (this.securityManager) {
        this.securityManager.cleanup()
      }
      this.isInitialized = false
      console.log('🧹 ContentScript cleanup complete')
    } catch (error) {
      console.error('ContentScript cleanup failed:', error)
    }
  }
}

new ContentScript()

window.addEventListener('beforeunload', () => {
})