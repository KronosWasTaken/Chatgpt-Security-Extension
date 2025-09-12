export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface NotificationOptions {
  duration?: number
  persistent?: boolean
  id?: string
}

export class NotificationManager {
  private activeNotifications: HTMLElement[] = []
  private notificationOffset = 0
  private styleInjected = false

  show(message: string, type: NotificationType = 'info', options: NotificationOptions = {}): string {
    this.ensureStylesInjected()
    
    const id = options.id || this.generateId()
    const notification = this.createNotificationElement(message, type, id)
    
    this.positionNotification(notification)
    this.animateIn(notification)
    
    document.body.appendChild(notification)
    this.activeNotifications.push(notification)
    
    if (!options.persistent) {
      this.scheduleRemoval(notification, options.duration || this.getDefaultDuration(type))
    }
    
    return id
  }

  hide(id: string): void {
    const notification = document.querySelector(`[data-notification-id="${id}"]`) as HTMLElement
    if (notification) {
      this.removeNotification(notification)
    }
  }

  clear(): void {
    const notifications = [...this.activeNotifications]
    for (const notification of notifications) {
      this.removeNotification(notification)
    }
  }

  private createNotificationElement(message: string, type: NotificationType, id: string): HTMLElement {
    const notification = document.createElement('div')
    
    notification.dataset.notificationId = id
    notification.className = `notification notification-${type}`
    notification.textContent = message
    
    notification.style.cssText = `
      position: fixed;
      right: 20px;
      background: ${this.getBackgroundColor(type)};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      max-width: 320px;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease-out;
    `
    
    return notification
  }

  private positionNotification(notification: HTMLElement): void {
    const topPosition = 20 + this.notificationOffset
    notification.style.top = `${topPosition}px`
    this.notificationOffset += 70
  }

  private animateIn(notification: HTMLElement): void {
    requestAnimationFrame(() => {
      notification.style.opacity = '1'
      notification.style.transform = 'translateX(0)'
    })
  }

  private animateOut(notification: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      notification.style.opacity = '0'
      notification.style.transform = 'translateX(100%)'
      
      setTimeout(() => {
        resolve()
      }, 300)
    })
  }

  private async removeNotification(notification: HTMLElement): Promise<void> {
    const index = this.activeNotifications.indexOf(notification)
    if (index === -1) return

    await this.animateOut(notification)
    
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification)
    }
    
    this.activeNotifications.splice(index, 1)
    this.updateNotificationPositions()
  }

  private updateNotificationPositions(): void {
    this.notificationOffset = Math.max(0, this.activeNotifications.length * 70)
  }

  private scheduleRemoval(notification: HTMLElement, duration: number): void {
    setTimeout(() => {
      this.removeNotification(notification)
    }, duration)
  }

  private getBackgroundColor(type: NotificationType): string {
    const colors = {
      error: '#ef4444',
      success: '#10b981',
      warning: '#f59e0b',
      info: '#3b82f6'
    }
    return colors[type]
  }

  private getDefaultDuration(type: NotificationType): number {
    const durations = {
      error: 7000,
      success: 4000,
      warning: 6000,
      info: 5000
    }
    return durations[type]
  }

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private ensureStylesInjected(): void {
    if (this.styleInjected) return

    const style = document.createElement('style')
    style.textContent = `
      .notification {
        font-weight: 500;
        line-height: 1.4;
        cursor: pointer;
      }
      
      .notification:hover {
        opacity: 0.9 !important;
      }
      
      .notification-error {
        border-left: 4px solid #dc2626;
      }
      
      .notification-success {
        border-left: 4px solid #059669;
      }
      
      .notification-warning {
        border-left: 4px solid #d97706;
      }
      
      .notification-info {
        border-left: 4px solid #2563eb;
      }
    `
    
    document.head.appendChild(style)
    this.styleInjected = true
  }
}