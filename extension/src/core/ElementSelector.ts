export class ElementSelector {
  private static readonly SELECTORS = {
    UPLOAD: [
      'input[type="file"]',
      'button[data-testid="composer-plus-btn"]',
      'button.composer-btn',
      'button[data-testid*="composer-plus"]',
      'button[data-testid*="attach"]',
      'button[aria-label*="attach"]',
      'button[aria-label*="Attach"]',
      'button:has(svg[data-testid*="paperclip"])',
      '[data-testid*="paperclip"]',
      'button[data-testid*="upload"]',
      'button[aria-label*="upload"]',
      'button[aria-label*="Upload"]'
    ],
    
    SEND_BUTTON: [
      // ChatGPT.com specific
      'button[data-testid="send-button"]',
      'button[aria-label="Send message"]',
      'button[aria-label="Send"]',
      'button[id*="send"]',
      'button[type="submit"]',
      // Common patterns
      '.send-button',
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      'button[data-testid*="submit"]',
      'button[data-testid*="send"]',
      'button[aria-label*="Submit"]',
      'button[aria-label*="submit"]',
      'button[data-testid*="composer-send"]',
      'button[aria-label*="Send message"]',
      'button[aria-label*="Send message to ChatGPT"]',
      'button[title*="Send"]',
      'button[title*="send"]',
      'button:has(svg[data-testid*="send"])',
      'button:has(svg[data-testid*="arrow"])',
      'button:has(svg[data-testid*="paper-plane"])',
      'button:has(svg[data-testid*="send-icon"])',
      '[data-testid*="send-button"]',
      '[data-testid*="composer-send"]'
    ],
    
    TEXT_INPUT: [
      // ChatGPT.com specific selectors (priority first)
      '#prompt-textarea',
      'textarea[name="prompt-textarea"]',
      'textarea[id*="prompt"]',
      'textarea[data-id*="root"]',
      'div[contenteditable="true"][data-id*="root"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[data-message-author-role="user"][contenteditable="true"]',
      // Generic patterns
      'div[contenteditable="true"].ProseMirror',
      'textarea[placeholder*="Ask anything"]',
      'div[contenteditable="true"]',
      "[data-placeholder='Ask anything']",
      'textarea',
      '[data-testid="chat-input"]', 
      '.claude-input',
      '.message-input',
      'div[contenteditable="true"]',
      'textarea[data-id]', 
      'textarea#prompt-textarea', 
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="ChatGPT"]', 
      'textarea', 
      'input[type="text"]',
      '[role="textbox"]', 
      '.ProseMirror', 
      '[data-lexical-editor="true"]'
    ]
  }

  static getAllUploadElements(): HTMLElement[] {
    return this.getElementsBySelectors(this.SELECTORS.UPLOAD)
  }

  static getAllSendButtons(): HTMLElement[] {
    return this.getElementsBySelectors(this.SELECTORS.SEND_BUTTON)
  }

  static getAllTextInputs(): HTMLElement[] {
    return this.getElementsBySelectors(this.SELECTORS.TEXT_INPUT)
  }

  static getFirstTextWithContent(): { element: HTMLElement; text: string } | null {
    console.log('\n ElementSelector.getFirstTextWithContent: Starting text extraction')
    console.log('   Trying selectors:', this.SELECTORS.TEXT_INPUT)
    
    for (const selector of this.SELECTORS.TEXT_INPUT) {
      try {
        console.log('   Trying selector:', selector)
        const element = document.querySelector(selector) as HTMLElement
        console.log('   Found element:', element)
        
        if (element) {
          const text = element.textContent || (element as HTMLInputElement).value || ''
          console.log('   Element text content:', element.textContent?.substring(0, 100))
          console.log('   Element value:', (element as HTMLInputElement).value?.substring(0, 100))
          console.log('   Extracted text:', text.substring(0, 100))
          console.log('   Text length:', text.length)
          
          if (text.length > 0) {
            console.log(' Found text:', text.substring(0, 100), '...')
            return { element, text }
          }
        }
      } catch (error) {
        console.error('   Error with selector', selector, ':', error)
        continue
      }
    }
    
    console.log(' No text found in any selectors')
    console.log('   Trying fallback: querySelectorAll for textarea')
    
    // Fallback: try all textareas
    const allTextareas = document.querySelectorAll('textarea')
    console.log('   Found textareas:', allTextareas.length)
    
    for (let i = 0; i < allTextareas.length; i++) {
      const textarea = allTextareas[i] as HTMLTextAreaElement
      const text = textarea.value || textarea.textContent || ''
      console.log(`   Textarea ${i}:`, text.substring(0, 50))
      
      if (text.length > 0) {
        console.log(' Found text in fallback textarea:', text.substring(0, 50))
        return { element: textarea, text }
      }
    }
    
    console.log(' No text found anywhere')
    return null
  }

  static isSendButton(element: HTMLElement): boolean {
    if (element.getAttribute('data-testid')?.includes('send') ||
        element.getAttribute('aria-label')?.toLowerCase().includes('send') ||
        element.getAttribute('title')?.toLowerCase().includes('send') ||
        element.textContent?.toLowerCase().includes('send')) {
      return true
    }
    
    const sendButton = element.closest('button[data-testid*="send"], button[aria-label*="send"], button[title*="send"], button[data-testid*="composer-send"]')
    if (sendButton) {
      return true
    }
    
    if (element.tagName === 'SVG' || element.tagName === 'svg') {
      const parentButton = element.closest('button')
      if (parentButton && (
        parentButton.getAttribute('data-testid')?.includes('send') ||
        parentButton.getAttribute('aria-label')?.toLowerCase().includes('send') ||
        parentButton.getAttribute('title')?.toLowerCase().includes('send')
      )) {
        return true
      }
    }
    
    return false
  }

  static isTextInput(element: HTMLElement): boolean {
    if (['TEXTAREA', 'INPUT'].includes(element.tagName) || 
        element.contentEditable === 'true') {
      return true
    }

    return this.SELECTORS.TEXT_INPUT.some(selector => {
      try {
        return element.matches(selector)
      } catch {
        return false
      }
    })
  }

  private static getElementsBySelectors(selectors: string[]): HTMLElement[] {
    const elements: HTMLElement[] = []
    
    for (const selector of selectors) {
      try {
        const found = document.querySelectorAll(selector)
        found.forEach(element => {
          elements.push(element as HTMLElement)
        })
      } catch (error) {
        continue
      }
    }
    
    return elements
  }
}