export type EventHandler = (event: Event) => Promise<boolean> | boolean

export class EventManager {
  private handlers = new Map<string, Set<EventHandler>>()
  private activeListeners = new Map<string, EventListener>()

  addHandler(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
      this.setupListener(eventType)
    }
    
    this.handlers.get(eventType)!.add(handler)
  }

  removeHandler(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType)
    if (!handlers) return

    handlers.delete(handler)
    
    if (handlers.size === 0) {
      this.removeListener(eventType)
      this.handlers.delete(eventType)
    }
  }

  preventAndStop(event: Event): void {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
  }

  createApprovedEvent(originalEvent: Event): Event {
    let newEvent: Event

    if (originalEvent instanceof MouseEvent) {
      newEvent = new MouseEvent(originalEvent.type, {
        bubbles: true,
        cancelable: true,
        view: window
      })
    } else if (originalEvent instanceof KeyboardEvent) {
      newEvent = new KeyboardEvent(originalEvent.type, {
        key: originalEvent.key,
        ctrlKey: originalEvent.ctrlKey,
        metaKey: originalEvent.metaKey,
        shiftKey: originalEvent.shiftKey,
        bubbles: true,
        cancelable: true
      })
    } else {
      newEvent = new Event(originalEvent.type, {
        bubbles: true,
        cancelable: true
      })
    }

    ;(newEvent as any).promptGuardApproved = true
    return newEvent
  }

  isApprovedEvent(event: Event): boolean {
    return !!(event as any).promptGuardApproved
  }

  retriggerEvent(target: EventTarget, event: Event, delay: number = 50): void {
    const approvedEvent = this.createApprovedEvent(event)
    
    setTimeout(() => {
      target.dispatchEvent(approvedEvent)
    }, delay)
  }

  private setupListener(eventType: string): void {
    const listener = async (event: Event) => {
      const handlers = this.handlers.get(eventType)
      if (!handlers) return

      for (const handler of handlers) {
        try {
          const result = await handler(event)
          if (result === false) {
            break
          }
        } catch (error) {
          console.error(`Error in ${eventType} handler:`, error)
        }
      }
    }

    document.addEventListener(eventType, listener, true)
    this.activeListeners.set(eventType, listener)
  }

  private removeListener(eventType: string): void {
    const listener = this.activeListeners.get(eventType)
    if (listener) {
      document.removeEventListener(eventType, listener, true)
      this.activeListeners.delete(eventType)
    }
  }

  cleanup(): void {
    for (const [eventType] of this.activeListeners) {
      this.removeListener(eventType)
    }
    this.handlers.clear()
  }
}