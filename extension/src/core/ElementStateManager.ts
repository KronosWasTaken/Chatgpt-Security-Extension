import { ElementSelector } from './ElementSelector'

export class ElementStateManager {
  private disabledElements = new Set<HTMLElement>()
  private originalStates = new WeakMap<HTMLElement, Record<string, string>>()

  disable(element: HTMLElement, reason: string): void {
    if (this.disabledElements.has(element)) {
      return
    }

    this.saveOriginalState(element)
    this.applyDisabledState(element, reason)
    this.disabledElements.add(element)
  }

  enable(element: HTMLElement): void {
    if (!this.disabledElements.has(element)) {
      return
    }

    this.restoreOriginalState(element)
    this.disabledElements.delete(element)
  }

  disableAllSendButtons(reason: string = 'Security guard initializing...'): void {
    const disableButtons = () => {
      const sendButtons = ElementSelector.getAllSendButtons()
      
      for (const button of sendButtons) {
        this.disable(button, reason)
      }
      
      if (sendButtons.length === 0 && document.readyState === 'loading') {
        setTimeout(disableButtons, 100)
      }
    }
    
    disableButtons()
  }

  enableAllSendButtons(): void {
    const elementsToEnable = Array.from(this.disabledElements)
    
    for (const element of elementsToEnable) {
      this.enable(element)
    }
  }

  isDisabled(element: HTMLElement): boolean {
    return this.disabledElements.has(element)
  }

  getDisabledCount(): number {
    return this.disabledElements.size
  }

  private saveOriginalState(element: HTMLElement): void {
    const properties = ['disabled', 'title', 'pointerEvents', 'opacity', 'cursor']
    const state: Record<string, string> = {}

    for (const prop of properties) {
      if (prop === 'disabled') {
        state[prop] = element.getAttribute('disabled') || 'false'
      } else {
        state[prop] = element.style[prop as any] || ''
      }
    }

    if (element.title) {
      state.originalTitle = element.title
    }

    this.originalStates.set(element, state)
  }

  private applyDisabledState(element: HTMLElement, reason: string): void {
    if (['INPUT', 'BUTTON'].includes(element.tagName)) {
      (element as HTMLInputElement | HTMLButtonElement).disabled = true
    }

    Object.assign(element.style, {
      opacity: '0.6',
      pointerEvents: 'none',
      cursor: 'not-allowed'
    })

    element.title = `🛡️ ${reason}`
    element.classList.add('prompt-guard-disabled')
  }

  private restoreOriginalState(element: HTMLElement): void {
    const state = this.originalStates.get(element)
    if (!state) return

    if (['INPUT', 'BUTTON'].includes(element.tagName)) {
      (element as HTMLInputElement | HTMLButtonElement).disabled = state.disabled === 'true'
    }

    element.style.opacity = state.opacity || ''
    element.style.pointerEvents = state.pointerEvents || ''
    element.style.cursor = state.cursor || ''
    element.title = state.originalTitle || ''
    
    element.classList.remove('prompt-guard-disabled')
    this.originalStates.delete(element)
  }
}