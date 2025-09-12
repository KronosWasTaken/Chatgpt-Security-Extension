import { PromptGuard } from './guards/PromptGuard'
import { FileUploadMonitor } from './monitoring/FileUploadMonitor'
import { NotificationManager } from './ui/NotificationManager'

export class SecurityManager {
  private promptGuard: PromptGuard
  private fileUploadMonitor: FileUploadMonitor
  private notificationManager: NotificationManager
  private isInitialized = false

  constructor() {
    try {
      console.log('🔍 SecurityManager: Creating components...')
      this.notificationManager = new NotificationManager()
      this.promptGuard = new PromptGuard()
      this.fileUploadMonitor = new FileUploadMonitor()
      
      this.setupGlobalNotifications()
      console.log('✅ SecurityManager: Components created successfully')
    } catch (error) {
      console.error('🚨 SecurityManager constructor failed:', error)
      throw error
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ SecurityManager already initialized, skipping...')
      return
    }

    try {
      console.log('🔄 SecurityManager: Starting initialization...')
      
      await this.checkExtensionStatus()
      console.log('✅ Extension status checked')
      
      this.setupFileUploadMonitoring()
      console.log('✅ File upload monitoring setup')
      
      this.setupPromptProtection()
      console.log('✅ Prompt protection setup')
      
      await this.logInitialization()
      console.log('✅ Initialization logged')
      
      this.isInitialized = true
      console.log('✅ SecurityManager: Initialization complete!')
    } catch (error) {
      console.error('🚨 SecurityManager initialization failed:', error)
      this.notificationManager.show(
        '❌ Security system initialization failed',
        'error'
      )
      throw error
    }
  }

  private async checkExtensionStatus(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' })
      const isEnabled = response?.isEnabled !== false
      
      this.promptGuard.setEnabled(isEnabled)
      this.fileUploadMonitor.setEnabled(isEnabled)
      
      if (!isEnabled) {
        this.notificationManager.show(
          '⚪ Security scanner disabled - uploads allowed',
          'info'
        )
      }
    } catch (error) {
      console.warn('Could not check extension status:', error)
    }
  }

  private setupFileUploadMonitoring(): void {
    this.fileUploadMonitor.initialize()
  }

  private setupPromptProtection(): void {
    if (this.isChatGPTDomain()) {
      this.notificationManager.show(
        '🛡️ ChatGPT detected - activating prompt injection protection',
        'info'
      )
    }
  }

  private setupGlobalNotifications(): void {
    const originalPromptNotification = this.promptGuard['showNotification']
    if (originalPromptNotification) {
      this.promptGuard['showNotification'] = (message: string, type: any) => {
        this.notificationManager.show(message, type)
      }
    }

    const originalFileNotification = this.fileUploadMonitor['fileGuard']['showNotification']
    if (originalFileNotification) {
      this.fileUploadMonitor['fileGuard']['showNotification'] = (message: string, type: any) => {
        this.notificationManager.show(message, type)
      }
    }
  }

  private async logInitialization(): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'ADD_LOG',
        message: `Security Manager initialized on: ${window.location.href}`,
        logType: 'info'
      })
    } catch (error) {
      console.warn('Could not log initialization:', error)
    }
  }

  private isChatGPTDomain(): boolean {
    return ['chatgpt.com', 'chat.openai.com'].includes(window.location.hostname)
  }

  getStatus(): {
    promptGuardReady: boolean
    isInitialized: boolean
    domain: string
  } {
    return {
      promptGuardReady: this.promptGuard.isProtectionReady(),
      isInitialized: this.isInitialized,
      domain: window.location.hostname
    }
  }

  cleanup(): void {
    this.promptGuard.cleanup()
    this.notificationManager.clear()
    this.isInitialized = false
  }
}