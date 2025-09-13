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

  async checkPromptSafety(text: string): Promise<{ isSafe: boolean; pattern?: string; response?: any; piiResult?: any }> {
    if (!text || text.length < 5) {
      return { isSafe: true }
    }

    const piiResult = this.detectPII(text)
    if (piiResult.hasPII) {
      return { 
        isSafe: false, 
        piiResult 
      }
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
      await this.handleThreatDetected(safetyCheck.pattern, safetyCheck.response, textData.text, safetyCheck.piiResult)
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
      await this.handleThreatDetected(safetyCheck.pattern, safetyCheck.response, pastedText, safetyCheck.piiResult)
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
      await this.handleThreatDetected(safetyCheck.pattern, safetyCheck.response, textData.text, safetyCheck.piiResult)
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

  private async handleThreatDetected(pattern?: string, response?: any, blockedText?: string, piiResult?: any): Promise<void> {
    console.log('🔍 handleThreatDetected called with:', { pattern, response, blockedText, piiResult })
    
    if (piiResult) {
      console.log('🚨 PII detected, logging to extension...')
      const riskEmoji = piiResult.riskLevel === 'high' ? '🚨' : piiResult.riskLevel === 'medium' ? '⚠️' : 'ℹ️'
      const message = `${riskEmoji} PII detected! Risk: ${piiResult.riskLevel.toUpperCase()} - ${piiResult.piiTypes.join(', ')}`
      
      this.showNotification(message, 'error')
      this.clearTextInputs()
      
      await this.logPIIToExtension(
        `🚨 BLOCKED PII - ${piiResult.riskLevel.toUpperCase()} risk: ${piiResult.piiTypes.join(', ')}`,
        blockedText,
        piiResult
      )
    } else if (pattern) {
      console.log('🚨 Pattern detected, logging to extension...')
      const message = `🚨 BLOCKED PROMPT - Fallback Pattern Detection: "${pattern}"`
      this.showNotification(`🚨 Blocked! Dangerous pattern: "${pattern}" (API unavailable)`, 'error')
      await this.logThreatToExtension(message, blockedText, { pattern, type: 'fallback_pattern' })
    } else if (response) {
      console.log('🚨 AI response detected, logging to extension...')
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
        logType: 'error',
        category: 'prompt_injection'
      })
    } catch (error) {
      console.warn('Could not log threat to extension:', error)
    }
  }


  private async logPIIToExtension(message: string, blockedText?: string, piiResult?: any): Promise<void> {
    try {
      const logMessage = blockedText 
        ? `${message}\n\n📋 BLOCKED TEXT:\n"${this.truncateText(blockedText, 500)}"\n\n🔍 PII Details: ${JSON.stringify(piiResult, null, 2)}`
        : `${message}\n\n🔍 PII Details: ${JSON.stringify(piiResult, null, 2)}`
        
      await chrome.runtime.sendMessage({
        type: 'ADD_LOG',
        message: logMessage,
        logType: 'error',
        category: 'pii'
      })
    } catch (error) {
      console.warn('Could not log PII to extension:', error)
    }
  }

  private detectPII(text: string): any {
    const PII_PATTERNS = {
      names: {
        pattern: /\b(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
        name: 'Full Name with Title',
        risk: 'medium'
      },
      
      addresses: {
        pattern: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Circle|Cir|Court|Ct)\b/g,
        name: 'Street Address',
        risk: 'high'
      },
      
      zipCodes: {
        pattern: /\b\d{5}(?:-\d{4})?\b/g,
        name: 'ZIP Code',
        risk: 'medium'
      },
      
      birthDates: {
        pattern: /\b(?:born|birth|birthday|DOB|date of birth)[\s:]*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi,
        name: 'Birth Date',
        risk: 'high'
      },
      
      medicalDates: {
        pattern: /\b(?:admission|discharge|death|deceased)[\s:]*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi,
        name: 'Medical Date',
        risk: 'high'
      },
      
      ages: {
        pattern: /\b(?:age|aged)[\s:]*\d{2,3}\s*(?:years?|yrs?|old)\b/gi,
        name: 'Age Information',
        risk: 'medium'
      },
      
      phone: {
        pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
        name: 'Phone Number',
        risk: 'high'
      },
      
      fax: {
        pattern: /\b(?:fax|FAX)[\s:]*\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/gi,
        name: 'Fax Number',
        risk: 'high'
      },
      
      email: {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        name: 'Email Address',
        risk: 'high'
      },
      
      ssn: {
        pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g,
        name: 'Social Security Number',
        risk: 'high'
      },
      
      medicalRecord: {
        pattern: /\b(?:MRN|medical record|patient ID|patient number)[\s:]*[A-Z0-9]{6,12}\b/gi,
        name: 'Medical Record Number',
        risk: 'high'
      },
      
      healthPlan: {
        pattern: /\b(?:health plan|beneficiary|insurance|policy)[\s:]*[A-Z0-9]{8,15}\b/gi,
        name: 'Health Plan Beneficiary Number',
        risk: 'high'
      },
      
      accountNumbers: {
        pattern: /\b(?:account|acct)[\s:]*[A-Z0-9]{8,20}\b/gi,
        name: 'Account Number',
        risk: 'high'
      },
      
      certificates: {
        pattern: /\b(?:license|certificate|cert|permit)[\s:]*[A-Z0-9]{6,15}\b/gi,
        name: 'Certificate/License Number',
        risk: 'high'
      },
      
      vehicleIdentifiers: {
        pattern: /\b(?:VIN|vehicle ID|license plate|plate number)[\s:]*[A-Z0-9]{6,17}\b/gi,
        name: 'Vehicle Identifier',
        risk: 'medium'
      },
      
      licensePlates: {
        pattern: /\b[A-Z]{1,3}[\s\-]?\d{1,4}[\s\-]?[A-Z]{0,3}\b/g,
        name: 'License Plate',
        risk: 'medium'
      },
      
      deviceIdentifiers: {
        pattern: /\b(?:device ID|serial number|IMEI|MAC address)[\s:]*[A-Z0-9]{8,20}\b/gi,
        name: 'Device Identifier',
        risk: 'medium'
      },
      
      urls: {
        pattern: /\bhttps?:\/\/[^\s]+\b/g,
        name: 'URL',
        risk: 'low'
      },
      
      ipAddress: {
        pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
        name: 'IP Address',
        risk: 'medium'
      },
      
      biometrics: {
        pattern: /\b(?:fingerprint|voice print|biometric|retina scan|iris scan)[\s:]*[A-Z0-9]{10,50}\b/gi,
        name: 'Biometric Identifier',
        risk: 'high'
      },
      
      photos: {
        pattern: /\b(?:photo|picture|image|selfie|portrait)[\s:]*\w*\.(?:jpg|jpeg|png|gif|bmp|tiff)\b/gi,
        name: 'Photographic Image',
        risk: 'high'
      },
      
      uniqueCodes: {
        pattern: /\b(?:ID|identifier|code|number)[\s:]*[A-Z0-9]{6,20}\b/gi,
        name: 'Unique Identifying Code',
        risk: 'medium'
      },
      
      creditCard: {
        pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
        name: 'Credit Card Number',
        risk: 'high'
      },
      
      passport: {
        pattern: /\b(?:passport|passport number)[\s:]*[A-Z0-9]{6,12}\b/gi,
        name: 'Passport Number',
        risk: 'high'
      },
      
      driversLicense: {
        pattern: /\b(?:driver['\s]?license|DL)[\s:]*[A-Z0-9]{6,12}\b/gi,
        name: 'Driver\'s License',
        risk: 'high'
      }
    };

    const detectedPII = [];
    const piiTypes = [];
    let maxRisk = 'low';

    console.log('🔍 Starting PII pattern matching on text:', text.substring(0, 100) + '...')

    for (const [key, config] of Object.entries(PII_PATTERNS)) {
      const matches = text.match(config.pattern);
      if (matches) {
        console.log(`✅ PII pattern matched: ${key} (${config.name}) - matches:`, matches)
        piiTypes.push(config.name);
        detectedPII.push(...matches);
        
        if (config.risk === 'high') {
          maxRisk = 'high';
        } else if (config.risk === 'medium' && maxRisk !== 'high') {
          maxRisk = 'medium';
        }
      }
    }

    const result = {
      hasPII: piiTypes.length > 0,
      piiTypes,
      detectedPII,
      riskLevel: maxRisk
    };

    console.log('🔍 PII detection final result:', result)
    return result;
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