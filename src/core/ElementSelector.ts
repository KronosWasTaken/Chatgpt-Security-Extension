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
      'button[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      'button[type="submit"]',
      'button[data-testid*="submit"]',
      'button[data-testid*="send"]',
      'button[aria-label*="Submit"]',
      'button[aria-label*="submit"]'
    ],
    
    TEXT_INPUT: [
      'textarea[name="prompt-textarea"]',
      'div[contenteditable="true"].ProseMirror',
      '#prompt-textarea',
      'textarea[placeholder*="Ask anything"]',
      'div[contenteditable="true"]',
      'textarea'
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
    for (const selector of this.SELECTORS.TEXT_INPUT) {
      try {
        const element = document.querySelector(selector) as HTMLElement
        if (element) {
          const text = element.textContent || (element as HTMLInputElement).value || ''
          if (text.length > 0) {
            return { element, text }
          }
        }
      } catch (error) {
        continue
      }
    }
    return null
  }

  static isSendButton(element: HTMLElement): boolean {
    return (
      element.getAttribute('data-testid') === 'send-button' ||
      element.getAttribute('aria-label')?.toLowerCase().includes('send') ||
      element.textContent?.toLowerCase().includes('send') ||
      !!element.closest('button[data-testid="send-button"]') ||
      !!element.closest('button[aria-label*="Send"]') ||
      !!element.closest('button[aria-label*="send"]') ||
      !!element.closest('.prompt-guard-disabled')
    )
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