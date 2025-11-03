import { PromptGuard } from './guards/PromptGuard'
import { FileUploadMonitor } from './monitoring/FileUploadMonitor'
import { NotificationManager } from './ui/NotificationManager'

export class SecurityManager {
  private promptGuard: PromptGuard
  private fileUploadMonitor: FileUploadMonitor
  private notificationManager: NotificationManager
  private isInitialized = false
  private isEnabled = true

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

  setEnabled(enabled: boolean): void {
    console.log(`🔄 SecurityManager: Setting enabled to ${enabled}`)
    this.isEnabled = enabled
    
    // Enable/disable all security components
    this.promptGuard.setEnabled(enabled)
    this.fileUploadMonitor.setEnabled(enabled)
    
    if (enabled) {
      this.notificationManager.show(
        '🛡️ Security scanner activated - uploads are being monitored',
        'success'
      )
    } else {
      this.notificationManager.show(
        '⚪ Security scanner deactivated - uploads are not monitored',
        'info'
      )
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
    
    // Add image interaction tracking
    this.setupImageInteractionTracking()
  }

  private setupImageInteractionTracking(): void {
    // Monitor for image uploads and track interactions
    const originalHandleFileUpload = this.fileUploadMonitor['fileGuard']['handleFileUpload']
    
    if (originalHandleFileUpload) {
      this.fileUploadMonitor['fileGuard']['handleFileUpload'] = async (files: FileList, source: string) => {
        // Call original handler first
        const result = await originalHandleFileUpload.call(this.fileUploadMonitor['fileGuard'], files, source)
        
        // Track image interactions
        await this.trackImageInteractions(files, source)
        
        return result
      }
    }
  }

  private async trackImageInteractions(files: FileList, source: string): Promise<void> {
    try {
      // Check if any files are images
      const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/') || 
        /\\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(file.name)
      )
      
      if (imageFiles.length === 0) {
        return
      }
      
      console.log(`🖼️ IMAGE_INTERACTION: Detected ${imageFiles.length} image file(s) from ${source}`)
      
      // Get configuration
      const config = await this.getConfig()
      if (!config?.clientId || !config?.applicationId) {
        console.log('🖼️ IMAGE_INTERACTION: No client/application context available')
        return
      }
      
      // Calculate total size
      const totalSize = imageFiles.reduce((sum, file) => sum + file.size, 0)
      
      // Send interaction increment to backend
      await chrome.runtime.sendMessage({
        type: 'INCREMENT_INTERACTION',
        clientId: config.clientId,
        applicationId: config.applicationId,
        interactionType: 'image_upload',
        metadata: {
          file_count: imageFiles.length,
          file_types: imageFiles.map(f => f.type),
          total_size: totalSize,
          source: source,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          domain: window.location.hostname
        }
      })
      
      console.log('🖼️ IMAGE_INTERACTION: Interaction tracked successfully')
      
      // Show notification
      this.notificationManager.show(
        `📸 Tracked ${imageFiles.length} image upload(s) - interaction count updated`,
        'info'
      )
      
    } catch (error) {
      console.error('🖼️ IMAGE_INTERACTION: Failed to track image interactions:', error)
    }
  }

  private async getConfig(): Promise<{ clientId: string; applicationId: string } | null> {
    try {
      const result = await chrome.storage.sync.get(['clientConfig'])
      return result.clientConfig || null
    } catch (error) {
      console.error('Failed to get config:', error)
      return null
    }
  }

  private setupPromptProtection(): void {
    if (this.isChatGPTDomain() || this.isTestPage()) {
      this.notificationManager.show(
        '🛡️AI site detected - activating prompt injection and PII protection',
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
        logType: 'info',
        category: 'system'
      })
    } catch (error) {
      console.warn('Could not log initialization:', error)
    }
  }

  private isChatGPTDomain(): boolean {
    return ['chatgpt.com', 'chat.openai.com',"gemini.google.com"].includes(window.location.hostname)
  }

  private isTestPage(): boolean {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.pathname.includes('test-page.html')
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
    console.log('🧹 SecurityManager: Cleaning up...')
    this.promptGuard.cleanup()
    this.fileUploadMonitor.cleanup()
    this.notificationManager.clear()
    this.isInitialized = false
    console.log('✅ SecurityManager: Cleanup complete')
  }
}