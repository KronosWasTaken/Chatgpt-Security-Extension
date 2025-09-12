import type { PlasmoCSConfig } from "plasmo"
import { SecurityManager } from './SecurityManager'

export const config: PlasmoCSConfig = {
  matches: [
    "https://chatgpt.com/*", 
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

  constructor() {
    try {
      console.log('🚀 ContentScript: Starting initialization...')
      this.securityManager = new SecurityManager()
      this.initialize()
    } catch (error) {
      console.error('🚨 ContentScript constructor failed:', error)
      this.logError('ContentScript constructor failed', error)
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
        logType: 'info'
      })
    } catch (error) {
      console.warn('Could not log to extension:', error)
    }
  }

  private async logError(message: string, error: any): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'ADD_LOG',
        message: `${message}: ${error?.message || error}`,
        logType: 'error'
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