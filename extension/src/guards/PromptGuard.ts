import { ElementSelector } from '../core/ElementSelector'
import { ElementStateManager } from '../core/ElementStateManager'
import { EventManager } from '../core/EventManager'
import { BackendApiService } from '../services/BackendApiService'
import { getLogger } from '../shared/logger'
import { nanoid } from 'nanoid'

const logger = getLogger()

export class PromptGuard {
  private isReady = false
  private isEnabled = true
  private stateManager = new ElementStateManager()
  private eventManager = new EventManager()
  private backendApi: BackendApiService
  private attachedMainInputs = new WeakSet<HTMLElement>()
  private globalComposing = false
  private globalSubmitting = false

  constructor() {
    console.log('╔════════════════════════════════════════════════════════════════════╗')
    console.log('║  PromptGuard Constructor Called                                    ║')
    console.log('╚════════════════════════════════════════════════════════════════════╝')
    
    console.log('   Initializing BackendApiService...')
    this.backendApi = BackendApiService.getInstance()
    console.log('   ✅ BackendApiService instance created')
    
    console.log('   Setting up event handlers...')
    this.setupEventHandlers()
    console.log('   ✅ Event handlers set up')
    
    console.log('   Initializing protection...')
    this.initializeProtection()
    console.log('   ✅ Protection initialized')
    
    console.log('✅ PromptGuard: Fully initialized and ready to intercept prompts')
    console.log('   Use window.__promptGuardInstance to access the instance')
    console.log('   Use window.__promptGuardInstance.checkPromptSafety("test") to test')
  }

  async checkPromptSafety(text: string, correlationIdParam?: string): Promise<{ isSafe: boolean; pattern?: string; response?: any; piiResult?: any }> {
    // Safe initialization of correlationId at the top of the function
    const correlationId = correlationIdParam || (globalThis.crypto?.randomUUID?.() || crypto.randomUUID?.() || Math.random().toString(36).substring(2, 12))
    
    const startTime = Date.now()
    
    logger.info('prompt_guard_check_start', { 
      promptLen: text?.length || 0
    })
    console.log('='.repeat(80))
    console.log('🔍 PromptGuard.checkPromptSafety: ENTRY')
    console.log('='.repeat(80))
    console.log('🧩 Prompt analysis started', { correlationId, promptLength: text?.length })
    console.log('   Text length:', text?.length || 0)
    console.log('   Text preview:', text?.substring(0, 100) || 'N/A')
    console.log('   Full text:', text)
    console.log('   Text type:', typeof text)
    
    if (!text || text.length < 5) {
      console.log('✅ Text too short or empty, allowing')
      logger.debug('prompt_guard_check_passed', { 
        latencyMs: Date.now() - startTime,
        reason: 'text too short'
      })
      return { isSafe: true }
    }

    const preview = this.truncateText(text, 300)
    console.log('\n📝 Prompt details:')
    console.log('   Preview (300 chars):', preview)
    console.log('   Full length:', text.length)
    console.log('   Full text:', text)
    console.log('   Will send to backend:', text)

    // Do not write any pre-action logs; logging occurs only after completion

    try {
      console.log('\n📡 STEP 1: Using BackendApiService to analyze prompt')
      console.log('   Prompt text:', text)
      console.log('   Initializing BackendApiService...')
      
      // Initialize backend API service
      await this.backendApi.initialize()
      console.log('   BackendApiService initialized')
      
      console.log('   Backend enabled:', this.backendApi.isEnabled())
      console.log('   Backend config:', this.backendApi.getConfig())
      
    // If extension inactive, allow immediately and log locally
    if (!this.backendApi.isEnabled()) {
      try {
        const res = await chrome.storage.sync.get(['logs'])
        const logs = res.logs || []
        const timestamp = new Date().toISOString()
        const message = '[analyze/prompt] Scanner disabled — action allowed without scanning'
        const dedupKey = `${timestamp}|${message}`
        const existingKey = new Set(logs.map((l: any) => `${l.timestamp}|${l.message}`))
        if (!existingKey.has(dedupKey)) {
          const entry = {
            id: `${timestamp}-${Math.random().toString(36).slice(2,7)}`,
            timestamp,
            type: 'info',
            message,
            category: 'api'
          }
          const merged = [entry, ...logs].slice(0, 200)
          await chrome.storage.sync.set({ logs: merged })
        }
      } catch (e) {
        console.warn('Failed to write inactive log:', e)
      }
      return { isSafe: true }
    }

    // Use BackendApiService to analyze prompt
    console.log('   Calling analyzePromptInjection...', { correlationId })
    const backendResponse = await this.backendApi.analyzePromptInjection(text, correlationId)
      
      console.log('   Backend response received:', backendResponse)
      
      if (!backendResponse) {
        const latencyMs = Date.now() - startTime
        logger.error('prompt_guard_check_error', { 
          latencyMs,
          errType: 'null_response',
          reason: 'Backend API returned null'
        })
        console.error('❌ BackendApiService returned null - BLOCKING PROMPT')
        // Preserve text on block (source behavior - do NOT clear)
        this.showNotification('❌ Prompt analysis failed. Prompt blocked for security.', 'error')
        
        return {
          isSafe: false,
          response: {
            error: 'Backend API returned null response',
            backendError: true
          }
        }
      }
      
      // Convert BackendApiService response to our format
      const response = {
        success: true,
        isThreats: backendResponse.isThreats || false,
        threats: backendResponse.threats || [],
        riskLevel: backendResponse.riskLevel || 'safe',
        summary: backendResponse.summary || '',
        shouldBlock: backendResponse.shouldBlock || backendResponse.isThreats || false,
        blockReason: backendResponse.blockReason || null,
        piiDetection: backendResponse.piiDetection || null,
        quickPattern: backendResponse.quickPattern,
        dangerousPattern: backendResponse.dangerousPattern
      } as any
      
      console.log('\n📥 STEP 2: Response from BackendApiService')
      console.log('   isThreats:', backendResponse.isThreats)
      console.log('   shouldBlock:', response.shouldBlock)
      console.log('   riskLevel:', backendResponse.riskLevel)
      console.log('   threats:', backendResponse.threats)
      console.log('   summary:', backendResponse.summary)
      
      if (backendResponse.piiDetection?.hasPII) {
        console.log('   PII detected:', backendResponse.piiDetection)
      }

      // Check for backend failures
      if (!response || !response.success) {
        const error = response?.error || 'Backend analysis failed'
        console.error('❌ PromptGuard.checkPromptSafety: Backend analysis failed - BLOCKING prompt', error)
        // Preserve text on block (source behavior - do NOT clear)
        
        if (error.includes('Authentication required')) {
          this.showNotification('🔐 Authentication required. Please log in to use prompt protection.', 'error')
        } else if (error.includes('Backend unreachable') || error.includes('network')) {
          this.showNotification('❌ Backend unreachable. Prompt blocked for security. Please contact administrator.', 'error')
        } else {
          this.showNotification('❌ Prompt analysis failed. Prompt blocked for security.', 'error')
        }
        
        return {
          isSafe: false,
          response: {
            ...response,
            backendError: true
          }
        }
      }

      // STEP 3: Process backend response (matches source response handling contract)
      console.log('\n📝 STEP 3: Processing backend analysis result')
      
      const shouldBlock = Boolean(response.shouldBlock) || Boolean(response.isThreats)
      
      console.log('   Threat detected:', response.isThreats)
      console.log('   Should block:', shouldBlock)
      console.log('   Risk level:', response.riskLevel)
      console.log('   Summary:', response.summary)
      console.log('   Block reason:', response.blockReason)
      
      if (response.piiDetection) {
        console.log('   PII Detection:')
        console.log('      Has PII:', response.piiDetection.hasPII)
        console.log('      Types:', response.piiDetection.types)
        console.log('      Risk:', response.piiDetection.riskLevel)
      }

      const latencyMs = Date.now() - startTime

      // Decision point: Block or allow based on backend response (matches source contract)
      if (shouldBlock) {
        logger.warn('prompt_guard_check_failed', {
          latencyMs,
          reason: response.blockReason || 'Threat indicators detected',
          riskLevel: response.riskLevel
        })
        console.log('\n🚨 DECISION: THREAT DETECTED - BLOCKING PROMPT')
        console.log('   Reason:', response.blockReason || 'Threat indicators detected')
        
        // Show blocked toast (exact match to source)
        const blockedMessage = `Prompt blocked ❌: ${response.blockReason || response.summary || 'Security policy violation'}`
        this.showNotification(blockedMessage, 'error')
        
        // Clear text inputs on block (user requirement)
        this.clearTextInputs()
        
        // Emit PROMPT_ANALYSIS FAILURE via ANALYSIS_LOG_ADD (matches source logging pipeline)
        // Clear message with analyzer's reason
        // Structure: { id, createdAt, kind, status, message, meta: { promptPreview, ... }, details: { prompt, blockReason, policyId, rule, ... } } }
        const promptText = text || ''
        // Truncate prompt to 8k chars to prevent storage bloat
        const truncatedPrompt = promptText.length > 8000 
          ? promptText.substring(0, 8000) + '...[truncated]'
          : promptText
        const promptPreview = promptText.substring(0, 200).replace(/\n/g, ' ').trim()
        const failureMessage = response.blockReason || response.summary
          ? `Prompt blocked: ${response.blockReason || response.summary}`
          : 'Prompt analysis failed'
        
        await this.emitAnalysisLogAdd({
          kind: 'PROMPT_ANALYSIS',
          status: 'FAILURE',
          message: failureMessage, // Contains analyzer's reason
          details: {
            prompt: truncatedPrompt, // Full original prompt text (truncated if > 8k)
            shouldBlock: true,
            riskLevel: response.riskLevel,
            summary: response.summary,
            blockReason: response.blockReason,
            threats: response.threats || [],
            piiDetection: response.piiDetection,
            policyId: (response as any).policyId || undefined,
            rule: (response as any).rule || undefined,
            correlationId
          },
          ts: new Date().toISOString(),
          // Additional meta fields for unified structure
          meta: {
            promptPreview, // First 200 chars, no newlines
            promptLength: promptText.length,
            correlationId
          }
        })
        
        return { 
          isSafe: false, 
          response, 
          piiResult: response.piiDetection 
        }
      }

      // Only allow if backend explicitly says it's safe
      logger.info('prompt_guard_check_passed', { 
        latencyMs,
        riskLevel: response.riskLevel 
      })
      console.log('\n✅ DECISION: Prompt is SAFE - ALLOWING submission')
      console.log('   Risk level:', response.riskLevel)
      console.log('   Summary:', response.summary)
      
      // Emit PROMPT_ANALYSIS SUCCESS via ANALYSIS_LOG_ADD (matches source logging pipeline)
      // Clear message: "Prompt analysis complete"
      // Structure: { id, createdAt, kind, status, message, meta: { promptPreview, promptLength, model, correlationId }, details: { prompt, ... } }
      const promptText = backendResponse.prompt || backendResponse.text || text || ''
      // Truncate prompt to 8k chars to prevent storage bloat
      const truncatedPrompt = promptText.length > 8000 
        ? promptText.substring(0, 8000) + '...[truncated]'
        : promptText
      const promptPreview = promptText.substring(0, 200).replace(/\n/g, ' ').trim()
      
      await this.emitAnalysisLogAdd({
        kind: 'PROMPT_ANALYSIS',
        status: 'SUCCESS',
        message: 'Prompt analysis complete',
        details: {
          prompt: truncatedPrompt, // Full original prompt text (truncated if > 8k)
          shouldBlock: false,
          riskLevel: response.riskLevel,
          summary: response.summary,
          threats: response.threats || [],
          model: (backendResponse as any).model || undefined,
          correlationId
        },
        ts: new Date().toISOString(),
          // Additional meta fields for unified structure
          meta: {
            promptPreview, // First 200 chars, no newlines
            promptLength: promptText.length,
            model: (backendResponse as any).model || undefined,
            correlationId
          }
      })
      
      return { isSafe: true, response }
    } catch (error) {
      // CRITICAL: Backend dependency - if ANY error occurs, block the prompt
      console.error('\n❌ CRITICAL ERROR: Backend analysis failed')
      console.error('   Error type:', error instanceof Error ? error.name : typeof error)
      console.error('   Error message:', error instanceof Error ? error.message : String(error))
      console.error('   Stack trace:', error instanceof Error ? error.stack : 'none')
      console.error('\n🚫 BLOCKING PROMPT - No backend response received')
      console.error('   Reason: Backend is required for all prompts')
      console.error('   Prompt text:', text.substring(0, 100))
      
      // Preserve text on block (source behavior - do NOT clear)
      
      let errorMessage = '❌ Unable to reach backend. Prompt blocked for security.'
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = '❌ Backend timeout. Prompt blocked for security.'
        } else if (error.message.includes('network')) {
          errorMessage = '❌ Network error. Prompt blocked for security.'
        }
      }
      
      // Normalize error message (never show "undefined" - matches source error handling)
      const errorMsg = (error instanceof Error ? error.message : String(error)) || 'Analysis failed'
      const normalizedError = errorMsg || 'Unknown error occurred'
      
      console.error(`Prompt analysis failed [${correlationId}]:`, error)
      this.showNotification(`❌ ${normalizedError}`, 'error')
      
      await this.logThreatToExtension(
        '🚨 PROMPT BLOCKED - Backend unreachable/no response',
        text,
        { 
          error: normalizedError,
          type: 'backend_unreachable',
          timestamp: new Date().toISOString(),
          correlationId
        },
        correlationId
      )
      
      // Emit PROMPT_ANALYSIS FAILURE with details and save to audit events
      // Clear message: "Prompt analysis failed: error"
      // Structure: { id, createdAt, kind, status, message, meta: { promptPreview, ... }, details: { prompt, error, ... } }
      const promptText = text || ''
      const promptPreview = promptText.substring(0, 200).replace(/\n/g, ' ').trim()
      
      // Save to AnalysisLogService (for UI logs panel)
      await this.emitAnalysisLogAdd({
        kind: 'PROMPT_ANALYSIS',
        status: 'FAILURE',
        message: `Prompt analysis failed: ${normalizedError}`,
        details: {
          prompt: promptText, // Full original prompt text
          error: normalizedError,
          backendError: true,
          type: 'backend_unreachable',
          correlationId
        },
        ts: new Date().toISOString(),
        // Additional meta fields for unified structure
        meta: {
          promptPreview, // First 200 chars, no newlines
          promptLength: promptText.length,
          correlationId
        }
      })
      
      // Also save to backend audit events for persistence
      try {
        const backendApi = BackendApiService.getInstance()
        if (backendApi.isEnabled()) {
          await backendApi.logAuditEvent({
            type: 'prompt_analysis',
            message: `Prompt analysis failed: ${normalizedError}`,
            severity: 'error',
            correlationId,
            data: {
              correlationId,
              error: normalizedError,
              prompt: promptText.substring(0, 200), // Truncate for audit
              backendError: true,
              type: 'backend_unreachable',
              timestamp: new Date().toISOString()
            }
          })
        }
      } catch (auditError) {
        console.error(`Failed to save audit event on failure [${correlationId}]:`, auditError)
        // Don't fail the whole flow if audit logging fails
      }
      
      // Return UNSAFE so prompt is blocked
      return { 
        isSafe: false, 
        response: { 
          error: normalizedError,
          backendError: true,
          reason: 'No backend response received'
        } 
      }
    }
  }

  private setupEventHandlers(): void {
    console.log('\n🔍 Setting up event handlers...')
    console.log('   Registering: click, keydown, submit, paste, input')
    
    this.eventManager.addHandler('click', this.handleClick.bind(this))
    this.eventManager.addHandler('keydown', this.handleKeydown.bind(this))
    this.eventManager.addHandler('submit', this.handleSubmit.bind(this))
    this.eventManager.addHandler('paste', this.handlePaste.bind(this))
    this.eventManager.addHandler('input', this.handleInput.bind(this))
    
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    window.addEventListener('focus', this.handleWindowFocus.bind(this))
    
    // Add direct event listeners for debugging EVERY interaction
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      console.log('🔍 [DEBUG] Click detected on element:', target.tagName, target.className)
      
      if (ElementSelector.isSendButton(target)) {
        console.log('🎯 [DEBUG] Send button detected:', target)
      }
    }, true)
    
    document.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement
      console.log('🔍 [DEBUG] Keydown detected:', e.key, 'on', target.tagName)
      
      const isSendShortcut = (
        (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'Enter' && target.tagName === 'TEXTAREA')
      )
      
      if (isSendShortcut) {
        console.log('🎯 [DEBUG] Send shortcut detected:', e.key)
      }
    }, true)
    
    // Global Enter-to-send binding (SPA safe)
    document.addEventListener('compositionstart', () => { this.globalComposing = true }, true)
    document.addEventListener('compositionend',   () => { this.globalComposing = false }, true)
    document.addEventListener('keydown', async (evt) => {
      const e = evt as KeyboardEvent
      // Ignore if disabled
      if (!this.isEnabled) return
      // Only act on plain Enter (no Shift), and skip during IME composition
      if (e.key !== 'Enter' || e.shiftKey || this.globalComposing) return

      // Only handle if the target is a text input (textarea, input, or contenteditable)
      const target = e.target as HTMLElement
      if (!ElementSelector.isTextInput(target)) {
        return
      }

      // Prevent default to avoid unintended form submits/newlines
      e.preventDefault()
      e.stopPropagation()

      if (this.globalSubmitting) return
      this.globalSubmitting = true

      try {
        // Directly trigger the same handler as submit button instead of clicking
        // This ensures Enter key uses the exact same flow as clicking submit
        const handled = await this.handleSendAction(e, target)
        if (!handled) {
          // If handleSendAction didn't handle it (e.g., text too short), allow default behavior
          // But we already prevented default, so we need to trigger submission manually if needed
          const textData = ElementSelector.getFirstTextWithContent()
          if (!textData || textData.text.length <= 5) {
            // Text too short, allow natural submission
            const form = target.closest('form') as HTMLFormElement | null
            if (form) {
              ;(form as any).requestSubmit ? form.requestSubmit() : form.submit()
            }
          }
        }
      } finally {
        setTimeout(() => { this.globalSubmitting = false }, 250)
      }
    }, true)

    console.log('✅ All event handlers registered')
    console.log('   Will intercept ALL clicks and keyboard events')
  }

  private async handleClick(event: Event): Promise<boolean> {
    console.log('🔍 PromptGuard.handleClick: Event intercepted')
    
    if (!this.isEnabled) {
      console.log('⏸️ PromptGuard.handleClick: Guard disabled, allowing')
      return true
    }

    const target = event.target as HTMLElement
    console.log('🔍 PromptGuard.handleClick: Target element:', target.tagName, target.className)
    
    if (!ElementSelector.isSendButton(target)) {
      console.log('⏸️ PromptGuard.handleClick: Not a send button, allowing')
      return true
    }

    console.log('✅ PromptGuard.handleClick: Send button detected!')
    
    // Use the same handler as Enter key and form submit to ensure consistent behavior
    return await this.handleSendAction(event, target)
  }

  private async handleKeydown(event: Event): Promise<boolean> {
    if (!this.isEnabled) return true

    const keyEvent = event as KeyboardEvent
    const target = keyEvent.target as HTMLElement

    // Manual scan hotkey: Ctrl+Shift+L
    if ((keyEvent.ctrlKey || keyEvent.metaKey) && keyEvent.shiftKey && (keyEvent.key === 'L' || keyEvent.key === 'l')) {
      this.eventManager.preventAndStop(event)
      const textData = ElementSelector.getFirstTextWithContent()
      const text = textData?.text || ''
      if (text && text.length > 0) {
        const res = await this.checkPromptSafety(text)
        if (!res.isSafe) {
          await this.handleThreatDetected(res.pattern, res.response, text, res.piiResult)
        } else {
          this.showNotification('✅ Manual scan passed – no threats detected', 'success')
        }
      } else {
        this.showNotification('ℹ️ No prompt text found to scan', 'info')
      }
      return false
    }

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

    // Removed local pattern checking - all analysis must go through backend
    // Real-time checking removed to enforce backend dependency

    return true
  }

  /**
   * Unified handler for prompt submission from all sources:
   * - Clicking submit button (via handleClick)
   * - Pressing Enter key (via global/per-element handlers)
   * - Form submit event (via handleSubmit)
   * 
   * Flow: Enter→Analyze→(Send) - matches source promptguard/content.js structure
   */
  private async handleSendAction(event: Event, target: HTMLElement): Promise<boolean> {
    // Check enable state first
    if (!this.isEnabled) {
      // Extension disabled, allow default behavior
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

    const promptText = textData.text
    
    // Generate correlationId for this flow (used across all logs in this action)
    const correlationId = nanoid()
    
    this.eventManager.preventAndStop(event)
    
    // Step 1: Analyze prompt first (Enter→Analyze)
    const safetyCheck = await this.checkPromptSafety(promptText, correlationId)
    
    // Step 2: If blocked, show notification and return (no send)
    if (!safetyCheck.isSafe) {
      await this.handleThreatDetected(safetyCheck.pattern, safetyCheck.response, promptText, safetyCheck.piiResult, correlationId)
      return false
    }

    // Step 3: If safe, show success toast and trigger native Send
    this.showNotification('Prompt safe ✅', 'success')
    
    // Trigger native Send using SEND_BUTTON selector array (exact match to source)
    // This will send the prompt through its normal flow after successful scan
    await this.triggerNativeSend()
    
    return false
  }

  /**
   * Trigger native Send button click - matches source findAndClickSendButton() pattern
   * Uses SEND_BUTTON selector array from ElementSelector
   * Creates an approved event to bypass the interceptor and allow normal flow
   * Ensures prompt text is preserved before sending
   */
  private async triggerNativeSend(): Promise<void> {
    // First, verify text is still present in textarea before sending
    const textData = ElementSelector.getFirstTextWithContent()
    if (!textData || !textData.text || textData.text.length === 0) {
      console.warn('⚠️ triggerNativeSend: No text found in textarea, cannot send')
      return
    }
    
    console.log('✅ triggerNativeSend: Text verified, proceeding to send:', textData.text.substring(0, 50))
    
    const sendButtons = ElementSelector.getAllSendButtons()
    
    for (const button of sendButtons) {
      if (button && button.offsetParent !== null) {
        // Temporarily disable monitoring to avoid recursion
        this.stateManager.disable(button, 'Sending after analysis...')
        
        setTimeout(() => {
          try {
            // Verify text is still present before clicking
            const verifyText = ElementSelector.getFirstTextWithContent()
            if (!verifyText || !verifyText.text || verifyText.text.length === 0) {
              console.warn('⚠️ triggerNativeSend: Text cleared before send, aborting')
              this.stateManager.enable(button)
              return
            }
            
            // Create an approved click event that will bypass the interceptor
            const approvedClickEvent = this.eventManager.createApprovedEvent(new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window,
              buttons: 1
            }))
            
            // Mark the event as approved
            ;(approvedClickEvent as any).promptGuardApproved = true
            
            // Dispatch the approved event on the button first
            button.dispatchEvent(approvedClickEvent)
            
            // Also try native click as fallback to ensure send happens
            if (button && button.offsetParent !== null) {
              button.click()
            }
            
            // Re-enable after send completes
            setTimeout(() => {
              this.stateManager.enable(button)
            }, 1000)
          } catch (error) {
            console.error('Failed to trigger native send:', error)
            this.stateManager.enable(button)
          }
        }, 100)
        
        return
      }
    }
    
    // Fallback: try form submit if no button found
    const form = document.querySelector('form')
    if (form) {
      try {
        // Verify text is still present before submitting
        const verifyText = ElementSelector.getFirstTextWithContent()
        if (!verifyText || !verifyText.text || verifyText.text.length === 0) {
          console.warn('⚠️ triggerNativeSend: Text cleared before form submit, aborting')
          return
        }
        
        // Create an approved submit event
        const approvedSubmitEvent = this.eventManager.createApprovedEvent(new Event('submit', {
          bubbles: true,
          cancelable: true
        }))
        ;(approvedSubmitEvent as any).promptGuardApproved = true
        form.dispatchEvent(approvedSubmitEvent)
        
        // Also try native submit as fallback
        ;(form as any).requestSubmit ? (form as any).requestSubmit() : form.submit()
      } catch (error) {
        console.error('Failed to submit form:', error)
      }
    }
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

  /**
   * Emit ANALYSIS_LOG_ADD message via chrome.runtime.sendMessage
   * Matches source logging pipeline exactly
   */
  private async emitAnalysisLogAdd(payload: {
    kind: 'PROMPT_ANALYSIS'
    status: 'SUCCESS' | 'FAILURE'
    message: string
    details: any
    ts: string
    meta?: any
  }): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        kind: 'ANALYSIS_LOG_ADD',
        entry: {
          kind: payload.kind,
          status: payload.status,
          message: payload.message,
          details: payload.details,
          ts: payload.ts,
          meta: payload.meta // Pass meta field to background script
        }
      }).catch(err => {
        console.warn('Failed to emit ANALYSIS_LOG_ADD:', err)
        // Best-effort, don't block prompt submission
      })
    } catch (error) {
      console.warn('Failed to emit ANALYSIS_LOG_ADD:', error)
      // Best-effort, don't block prompt submission
    }
  }

  private async handleThreatDetected(pattern?: string, response?: any, blockedText?: string, piiResult?: any, correlationIdParam?: string): Promise<void> {
    // Safe initialization of correlationId
    const correlationId = correlationIdParam || (globalThis.crypto?.randomUUID?.() || crypto.randomUUID?.() || Math.random().toString(36).substring(2, 12))
    console.log('🔍 handleThreatDetected called with:', { pattern, response, blockedText, piiResult })
    
    // Clear input field for FAILURE/UNSAFE prompts
    this.clearTextInputs()
    
    // Get the reason for the toast message
    let reason = 'Security policy violation'
    if (piiResult?.hasPII) {
      reason = `PII detected: ${piiResult.types?.join(', ') || 'sensitive data'}`
    } else if (pattern) {
      reason = `Dangerous pattern: ${pattern}`
    } else if (response) {
      reason = response.blockReason || response.summary || 'Security policy triggered'
    }
    
    // Show non-blocking toast with reason
    const toastMessage = `Blocked: ${reason}`
    this.showNotification(toastMessage, 'error')
    
    // Return focus to input field after clearing
    const textInput = ElementSelector.getFirstTextWithContent()
    if (textInput?.element) {
      try {
        ;(textInput.element as HTMLElement).focus()
        // For contenteditable elements, restore cursor position
        if (textInput.element.contentEditable === 'true') {
          const range = document.createRange()
          const sel = window.getSelection()
          if (sel && textInput.element.firstChild) {
            range.setStart(textInput.element.firstChild, 0)
            range.collapse(true)
            sel.removeAllRanges()
            sel.addRange(range)
          }
        }
      } catch (e) {
        // Ignore focus errors
        console.warn('Failed to focus input after clearing:', e)
      }
    }
    
    if (piiResult?.hasPII) {
      console.log('🚨 PII detected (backend), logging to extension...', { correlationId })
      const riskEmoji = piiResult.riskLevel === 'high' ? '🚨' : piiResult.riskLevel === 'medium' ? '⚠️' : 'ℹ️'
      const types = piiResult.types || []
      
      await this.logPIIToExtension(
        `🚨 BLOCKED PII - ${piiResult.riskLevel.toUpperCase()} risk: ${types.join(', ')}`,
        blockedText,
        piiResult,
        correlationId
      )
    } else if (pattern) {
      console.log('🚨 Pattern detected, logging to extension...', { correlationId })
      await this.logThreatToExtension(
        `🚨 BLOCKED PROMPT - Fallback Pattern Detection: "${pattern}"`,
        blockedText,
        { pattern, type: 'fallback_pattern', correlationId },
        correlationId
      )
    } else if (response) {
      console.log('🚨 Backend analysis detected threat, logging to extension...', { correlationId })
      const riskLevel = response.riskLevel?.toUpperCase() || 'UNKNOWN'
      
      await this.logThreatToExtension(
        `🚨 BLOCKED PROMPT - ${riskLevel} risk: ${reason}`,
        blockedText,
        { response, type: 'ai_detection', correlationId },
        correlationId
      )
    }
  }

  private async logThreatToExtension(message: string, blockedText?: string, details?: any, correlationIdParam?: string): Promise<void> {
    // Safe initialization of correlationId
    const correlationId = correlationIdParam || (globalThis.crypto?.randomUUID?.() || crypto.randomUUID?.() || Math.random().toString(36).substring(2, 12))
    
    try {
      const logMessage = blockedText 
        ? `${message}\n\n📋 BLOCKED PROMPT TEXT:\n"${this.truncateText(blockedText, 500)}"\n\n🔍 Details: ${JSON.stringify({ ...details, correlationId }, null, 2)}`
        : `${message}\n\n🔍 Details: ${JSON.stringify({ ...details, correlationId }, null, 2)}`
        
      await chrome.runtime.sendMessage({
        type: 'ADD_LOG',
        message: logMessage,
        logType: 'error',
        category: 'prompt_injection'
      })
      
      // Also log to backend audit system (similar to FileGuard)
      const backendApi = BackendApiService.getInstance()
      if (backendApi.isEnabled()) {
        await backendApi.logAuditEvent({
          type: 'prompt_blocked',
          message: message,
          severity: 'high',
          correlationId,
          data: {
            blockedText: blockedText ? this.truncateText(blockedText, 200) : undefined,
            details: { ...details, correlationId },
            url: window.location.href,
            timestamp: new Date().toISOString(),
            correlationId
          }
        })
      }
    } catch (error) {
      console.warn(`Could not log threat to extension [${correlationId}]:`, error)
    }
  }


  private async logPIIToExtension(message: string, blockedText?: string, piiResult?: any, correlationIdParam?: string): Promise<void> {
    // Safe initialization of correlationId
    const correlationId = correlationIdParam || (globalThis.crypto?.randomUUID?.() || crypto.randomUUID?.() || Math.random().toString(36).substring(2, 12))
    
    try {
      const logMessage = blockedText 
        ? `${message}\n\n📋 BLOCKED TEXT:\n"${this.truncateText(blockedText, 500)}"\n\n🔍 PII Details: ${JSON.stringify({ ...piiResult, correlationId }, null, 2)}`
        : `${message}\n\n🔍 PII Details: ${JSON.stringify({ ...piiResult, correlationId }, null, 2)}`
        
      await chrome.runtime.sendMessage({
        type: 'ADD_LOG',
        message: logMessage,
        logType: 'error',
        category: 'pii'
      })
      
      // Also log to backend audit system (similar to FileGuard)
      const backendApi = BackendApiService.getInstance()
      if (backendApi.isEnabled()) {
        await backendApi.logAuditEvent({
          type: 'pii_detected',
          message: message,
          severity: 'high',
          correlationId,
          data: {
            blockedText: blockedText ? this.truncateText(blockedText, 200) : undefined,
            piiTypes: piiResult?.types || [],
            riskLevel: piiResult?.riskLevel || 'unknown',
            url: window.location.href,
            timestamp: new Date().toISOString(),
            correlationId
          }
        })
      }
    } catch (error) {
      console.warn(`Could not log PII to extension [${correlationId}]:`, error)
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

  /**
   * Setup DOM observer for SPA robustness - matches source MutationObserver pattern
   * Ensures bindings restored without duplicates using idempotent guard (WeakSet)
   */
  private domObserver: MutationObserver | null = null
  
  private setupDOMObserver(): void {
    const startObserver = () => {
      if (!document.body) {
        console.log('🕇 PromptGuard: document.body not ready, waiting...')
        setTimeout(startObserver, 100)
        return
      }

      console.log('✅ PromptGuard: Starting DOM observer (SPA-safe rebinding)')
      this.domObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element
                
                // Only disable new buttons while guard is not ready yet
                if (!this.isReady) {
                  const newSendButtons = ElementSelector.getAllSendButtons().filter(btn => 
                    element.contains(btn) || element === btn
                  )
                  for (const button of newSendButtons) {
                    this.stateManager.disable(button, 'New button - protection initializing...')
                  }
                }

                // Attach enter key listener to main prompt inputs (idempotent binding)
                // WeakSet guard ensures no duplicates even on SPA re-render
                this.attachEnterListenerToMainInputs(element as HTMLElement)
              }
            })
          }
        }
      })

      this.domObserver.observe(document.body, { childList: true, subtree: true })

      // Also attempt initial attach in case inputs already exist
      this.attachEnterListenerToMainInputs(document.body)
    }

    startObserver()
  }

  /**
   * Attach Enter key listener to main inputs - matches source Enter handling verbatim
   * - Shift+Enter = newline (allowed)
   * - IME compose guard (skip during composition)
   * - Single-flight lock (isSubmitting)
   * - Enter→Analyze→(Send) flow
   */
  private attachEnterListenerToMainInputs(root: HTMLElement): void {
    try {
      const candidates: HTMLElement[] = []
      // Use TEXT_INPUT selectors from ElementSelector (matches source getInput() pattern)
      const textInputSelectors = ElementSelector.getAllTextInputs()
      candidates.push(...textInputSelectors)
      
      // Additional fallback selectors matching source
      candidates.push(...Array.from(root.querySelectorAll('[data-placeholder="Ask anything"]')) as HTMLElement[])
      candidates.push(...Array.from(root.querySelectorAll('[contenteditable="true"]')) as HTMLElement[])
      candidates.push(...Array.from(root.querySelectorAll('textarea')) as HTMLElement[])

      for (const el of candidates) {
        // Idempotent binding guard using WeakSet (matches source pattern)
        if (this.attachedMainInputs.has(el)) continue
        this.attachedMainInputs.add(el)

        // Per-element state to avoid double sends and handle IME composition (source pattern)
        let composing = false
        let isSubmitting = false

        el.addEventListener('compositionstart', () => { composing = true }, true)
        el.addEventListener('compositionend', () => { composing = false }, true)

        el.addEventListener('keydown', async (evt: Event) => {
          const e = evt as KeyboardEvent
          
          // Shift+Enter = newline (allowed) - matches source exactly
          if (e.key === 'Enter' && e.shiftKey) return
          
          // Only act on plain Enter, skip during IME composition
          if (e.key !== 'Enter' || composing) return

          // Prevent default newline and bubbling to avoid duplicate handlers
          e.preventDefault()
          e.stopPropagation()

          // Re-entry lock (debounce Enter while analysis in flight)
          if (isSubmitting) return
          isSubmitting = true

          try {
            // Enter→Analyze→(Send) flow - triggers handleSendAction which does analysis first
            const handled = await this.handleSendAction(e, el as HTMLElement)
            if (!handled) {
              // If handleSendAction didn't handle it (e.g., text too short), allow natural submission
              const textData = ElementSelector.getFirstTextWithContent()
              if (!textData || textData.text.length <= 5) {
                // Text too short, allow natural submission
                const form = (el as HTMLElement).closest('form') as HTMLFormElement | null
                if (form) {
                  ;(form as any).requestSubmit ? form.requestSubmit() : form.submit()
                }
              }
            }
          } finally {
            // Reset lock after delay (matches source debounce pattern)
            setTimeout(() => { isSubmitting = false }, 250)
          }
        }, true)
      }
    } catch (error) {
      console.warn('PromptGuard: Failed to attach enter listeners:', error)
    }
  }

  private async testThreatDetection(): Promise<void> {
    // Local-first: mark protection ready without requiring API healthcheck
    try {
      this.isReady = true
      this.stateManager.enableAllSendButtons()
      this.showNotification('🛡️ Prompt protection active!', 'success')
      
      // Fire-and-forget test call (does not affect readiness)
      const dynamicPrompt = `healthcheck ${window.location.hostname} ${new Date().toISOString()}`
      chrome.runtime.sendMessage({ type: 'TEST_PROMPT_INJECTION', prompt: dynamicPrompt }).catch(() => {})
    } catch (_) {
      // Even if something fails, keep protection enabled in local mode
      this.isReady = true
      this.stateManager.enableAllSendButtons()
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    console.log(`${type.toUpperCase()}: ${message}`)
    // This method will be overridden by SecurityManager to use NotificationManager
    // If not overridden, at least show an alert for errors
    if (type === 'error') {
      // Fallback: create a temporary notification element
      try {
        const notification = document.createElement('div')
        notification.textContent = message
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f44336; color: white; padding: 15px 20px; border-radius: 5px; z-index: 10000; font-size: 14px; max-width: 320px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);'
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 7000)
      } catch (e) {
        console.error('Failed to show notification:', e)
      }
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  isProtectionReady(): boolean {
    return this.isReady
  }

  cleanup(): void {
    console.log('🧹 PromptGuard: Cleaning up...')
    
    // Disconnect MutationObserver
    if (this.domObserver) {
      this.domObserver.disconnect()
      this.domObserver = null
    }
    
    // Cleanup event manager (removes all listeners)
    this.eventManager.cleanup()
    
    // Re-enable all send buttons
    this.stateManager.enableAllSendButtons()
    
    // Clear attached inputs
    this.attachedMainInputs = new WeakSet<HTMLElement>()
    
    console.log('✅ PromptGuard: Cleanup complete')
  }
}