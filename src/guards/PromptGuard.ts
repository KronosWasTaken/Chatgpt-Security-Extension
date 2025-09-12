import { PatternMatcher } from '../core/PatternMatcher'
import { ElementSelector } from '../core/ElementSelector'
import { ElementStateManager } from '../core/ElementStateManager'
import { EventManager } from '../core/EventManager'

export class PromptGuard {
  private isReady = false
  private isEnabled = true
  private stateManager = new ElementStateManager()
  private eventManager = new EventManager()

  constructor() {
    this.setupEventHandlers()
    this.initializeProtection()
  }

  async checkPromptSafety(text: string): Promise<{ isSafe: boolean; pattern?: string; response?: any }> {
    if (!text || text.length < 5) {
      return { isSafe: true }
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_PROMPT_INJECTION',
        prompt: text
      })

      const isThreat = response.success && (
        response.isThreats || 
        ['low', 'medium', 'high'].includes(response.riskLevel)
      )

      if (isThreat) {
        this.clearTextInputs()
        return { 
          isSafe: false, 
          response 
        }
      }

      return { isSafe: true, response }
    } catch (error) {
      console.warn('AI detection failed, falling back to pattern matching:', error)
      
      const dangerousPattern = PatternMatcher.containsDangerousPattern(text)
      if (dangerousPattern) {
        return { 
          isSafe: false, 
          pattern: dangerousPattern 
        }
      }
      
      return { isSafe: true }
    }
  }

  private setupEventHandlers(): void {
    this.eventManager.addHandler('click', this.handleClick.bind(this))
    this.eventManager.addHandler('keydown', this.handleKeydown.bind(this))
    this.eventManager.addHandler('submit', this.handleSubmit.bind(this))
    this.eventManager.addHandler('paste', this.handlePaste.bind(this))
    this.eventManager.addHandler('input', this.handleInput.bind(this))
    
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    window.addEventListener('focus', this.handleWindowFocus.bind(this))
  }

  private async handleClick(event: Event): Promise<boolean> {
    if (!this.isEnabled) return true

    const target = event.target as HTMLElement
    
    if (!ElementSelector.isSendButton(target)) {
      return true
    }

    if (!this.isReady) {
      this.eventManager.preventAndStop(event)
      this.showNotification('🚫 Send blocked - security guard initializing...', 'warning')
      return false
    }

    if (this.stateManager.isDisabled(target) || target.closest('.prompt-guard-disabled')) {
      this.eventManager.preventAndStop(event)
      return false
    }

    if (this.eventManager.isApprovedEvent(event)) {
      return true
    }

    const textData = ElementSelector.getFirstTextWithContent()
    if (!textData || textData.text.length <= 5) {
      return true
    }

    this.eventManager.preventAndStop(event)
    
    const safetyCheck = await this.checkPromptSafety(textData.text)
    
    if (!safetyCheck.isSafe) {
      await this.handleThreatDetected(safetyCheck.pattern, safetyCheck.response, textData.text)
      return false
    }

    this.eventManager.retriggerEvent(target, event)
    return false
  }

  private async handleKeydown(event: Event): Promise<boolean> {
    if (!this.isEnabled) return true

    const keyEvent = event as KeyboardEvent
    const target = keyEvent.target as HTMLElement

    const isSendShortcut = (
      (keyEvent.key === 'Enter' && (keyEvent.ctrlKey || keyEvent.metaKey)) ||
      (keyEvent.key === 'Enter' && !keyEvent.shiftKey && target.tagName === 'TEXTAREA')
    )

    if (!isSendShortcut) return true

    return this.handleSendAction(event, target)
  }

  private async handleSubmit(event: Event): Promise<boolean> {
    if (!this.isEnabled) return true

    const form = event.target as HTMLFormElement
    return this.handleSendAction(event, form)
  }

  private async handlePaste(event: Event): Promise<boolean> {
    if (!this.isEnabled) return true

    const target = event.target as HTMLElement
    
    if (!ElementSelector.isTextInput(target)) {
      return true
    }

    if (!this.isReady) {
      this.eventManager.preventAndStop(event)
      this.showNotification('🚫 Paste blocked - security guard initializing...', 'warning')
      return false
    }

    const pasteEvent = event as ClipboardEvent
    const clipboardData = pasteEvent.clipboardData || (window as any).clipboardData
    const pastedText = clipboardData?.getData('text')

    if (!pastedText || pastedText.length <= 5) {
      return true
    }

    this.eventManager.preventAndStop(event)
    
    const safetyCheck = await this.checkPromptSafety(pastedText)
    
    if (!safetyCheck.isSafe) {
      await this.handleThreatDetected(safetyCheck.pattern, safetyCheck.response, pastedText)
      return false
    }

    this.insertSafeText(target, pastedText)
    return false
  }

  private async handleInput(event: Event): Promise<boolean> {
    if (!this.isEnabled) return true

    const target = event.target as HTMLElement
    
    if (!ElementSelector.isTextInput(target)) {
      return true
    }

    const currentText = target.textContent || (target as HTMLInputElement).value || ''
    
    if (currentText.length <= 10) {
      return true
    }

    const quickPattern = PatternMatcher.containsQuickPattern(currentText)
    if (quickPattern) {
      this.clearElement(target)
      this.showNotification(`🚨 Text cleared! Dangerous pattern detected: "${quickPattern}"`, 'error')
      await this.logThreatToExtension(
        `🚨 BLOCKED TYPING - Real-time Pattern (API bypass): "${quickPattern}"`,
        currentText,
        { pattern: quickPattern, type: 'real_time_typing_fallback' }
      )
      return false
    }

    return true
  }

  private async handleSendAction(event: Event, target: HTMLElement): Promise<boolean> {
    if (!this.isReady) {
      this.eventManager.preventAndStop(event)
      this.showNotification('🚫 Send blocked - security guard initializing...', 'warning')
      return false
    }

    if (this.stateManager.isDisabled(target) || target.closest('.prompt-guard-disabled')) {
      this.eventManager.preventAndStop(event)
      return false
    }

    if (this.eventManager.isApprovedEvent(event)) {
      return true
    }

    const textData = ElementSelector.getFirstTextWithContent()
    if (!textData || textData.text.length <= 5) {
      return true
    }

    this.eventManager.preventAndStop(event)
    
    const safetyCheck = await this.checkPromptSafety(textData.text)
    
    if (!safetyCheck.isSafe) {
      await this.handleThreatDetected(safetyCheck.pattern, safetyCheck.response, textData.text)
      return false
    }

    this.eventManager.retriggerEvent(target, event)
    return false
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible' && !this.isReady) {
      this.stateManager.disableAllSendButtons('Page reloaded - reinitializing protection...')
    }
  }

  private handleWindowFocus(): void {
    if (!this.isReady) {
      this.stateManager.disableAllSendButtons('Window focused - ensuring protection...')
    }
  }

  private async handleThreatDetected(pattern?: string, response?: any, blockedText?: string): Promise<void> {
    if (pattern) {
      const message = `🚨 BLOCKED PROMPT - Fallback Pattern Detection: "${pattern}"`
      this.showNotification(`🚨 Blocked! Dangerous pattern: "${pattern}" (API unavailable)`, 'error')
      await this.logThreatToExtension(message, blockedText, { pattern, type: 'fallback_pattern' })
    } else if (response) {
      const riskLevel = response.riskLevel?.toUpperCase() || 'UNKNOWN'
      const message = `🚨 BLOCKED PROMPT - AI Detection: ${riskLevel} risk`
      this.showNotification(`🚨 Prompt injection blocked! Risk: ${riskLevel}`, 'error')
      await this.logThreatToExtension(message, blockedText, { response, type: 'ai_detection' })
    }
  }

  private async logThreatToExtension(message: string, blockedText?: string, details?: any): Promise<void> {
    try {
      const logMessage = blockedText 
        ? `${message}\n\n📋 BLOCKED PROMPT TEXT:\n"${this.truncateText(blockedText, 500)}"\n\n🔍 Details: ${JSON.stringify(details, null, 2)}`
        : `${message}\n\n🔍 Details: ${JSON.stringify(details, null, 2)}`
        
      await chrome.runtime.sendMessage({
        type: 'ADD_LOG',
        message: logMessage,
        logType: 'error'
      })
    } catch (error) {
      console.warn('Could not log threat to extension:', error)
    }
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text
    }
    return text.substring(0, maxLength) + '... [TRUNCATED]'
  }

  private clearTextInputs(): void {
    const textInputs = ElementSelector.getAllTextInputs()
    
    for (const element of textInputs) {
      this.clearElement(element)
    }
  }

  private clearElement(element: HTMLElement): void {
    if (['TEXTAREA', 'INPUT'].includes(element.tagName)) {
      (element as HTMLInputElement).value = ''
    } else {
      element.textContent = ''
    }
  }

  private insertSafeText(target: HTMLElement, text: string): void {
    try {
      if (['TEXTAREA', 'INPUT'].includes(target.tagName)) {
        const input = target as HTMLInputElement | HTMLTextAreaElement
        const start = input.selectionStart || 0
        const end = input.selectionEnd || 0
        const currentValue = input.value

        input.value = currentValue.substring(0, start) + text + currentValue.substring(end)
        const newCursorPos = start + text.length
        input.setSelectionRange(newCursorPos, newCursorPos)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      } else if (target.contentEditable === 'true') {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          range.deleteContents()
          range.insertNode(document.createTextNode(text))
          range.setStartAfter(range.endContainer)
          range.collapse(true)
          selection.removeAllRanges()
          selection.addRange(range)
          target.dispatchEvent(new Event('input', { bubbles: true }))
        }
      }
    } catch (error) {
      this.clearElement(target)
    }
  }

  private initializeProtection(): void {
    this.stateManager.disableAllSendButtons()
    this.setupDOMObserver()
    this.testThreatDetection()
  }

  private setupDOMObserver(): void {
    const startObserver = () => {
      if (!document.body) {
        console.log('🕇 PromptGuard: document.body not ready, waiting...')
        setTimeout(startObserver, 100)
        return
      }

      console.log('✅ PromptGuard: Starting DOM observer')
      const observer = new MutationObserver((mutations) => {
        if (this.isReady) return

        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element
                const newSendButtons = ElementSelector.getAllSendButtons().filter(btn => 
                  element.contains(btn) || element === btn
                )
                
                for (const button of newSendButtons) {
                  this.stateManager.disable(button, 'New button - protection initializing...')
                }
              }
            })
          }
        }
      })

      observer.observe(document.body, { childList: true, subtree: true })
    }

    startObserver()
  }

  private async testThreatDetection(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_PROMPT_INJECTION',
        prompt: 'test connection'
      })

      if (response && response.success !== undefined) {
        setTimeout(() => {
          if (this.isEnabled) {
            this.isReady = true
            this.stateManager.enableAllSendButtons()
            this.showNotification('🛡️ Prompt injection protection active!', 'success')
          }
        }, 500)
      } else {
        this.showNotification('⚠️ Prompt protection limited - API not ready', 'warning')
      }
    } catch (error) {
      this.showNotification('⚠️ Prompt protection limited - connection error', 'warning')
    }

    setTimeout(() => {
      if (!this.isReady) {
        this.isReady = true
        this.stateManager.enableAllSendButtons()
        this.showNotification('⚠️ Prompt protection active (limited mode)', 'warning')
      }
    }, 5000)
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    console.log(`${type.toUpperCase()}: ${message}`)
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  isProtectionReady(): boolean {
    return this.isReady
  }

  cleanup(): void {
    this.eventManager.cleanup()
    this.stateManager.enableAllSendButtons()
  }
}