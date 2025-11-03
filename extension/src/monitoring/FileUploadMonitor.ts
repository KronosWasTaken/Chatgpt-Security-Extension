import { FileGuard } from '../guards/FileGuard'

export class FileUploadMonitor {
  private fileGuard = new FileGuard()
  private attachedInputs = new Set<HTMLInputElement>()
  private domObserver: MutationObserver | null = null
  private periodicCheckInterval: number | null = null
  private dropHandler: ((event: DragEvent) => Promise<void>) | null = null
  private dragoverHandler: ((event: DragEvent) => void) | null = null
  private pasteHandler: ((event: ClipboardEvent) => Promise<void>) | null = null

  constructor() {
    console.log('🔧 FileUploadMonitor constructor called')
  }

  initialize(): void {
    console.log('🔧 FileUploadMonitor.initialize() called')
    this.monitorExistingInputs()
    this.monitorDragDrop()
    this.monitorPaste()
    this.setupDOMObserver()
    this.setupPeriodicCheck()
    console.log('✅ FileUploadMonitor initialization complete')
  }

  private monitorExistingInputs(): void {
    console.log('🔍 REAL_FILE_MONITOR: Looking for existing file inputs...')
    const fileInputs = document.querySelectorAll('input[type="file"]')
    console.log('🔍 REAL_FILE_MONITOR: Found file inputs:', fileInputs.length)
    
    for (const input of fileInputs) {
      console.log('🔍 REAL_FILE_MONITOR: Attaching listener to input:', input)
      // attachListenerToInput is async but we don't need to await it here
      this.attachListenerToInput(input as HTMLInputElement).catch(err => {
        console.warn('Failed to attach listener to input:', err)
      })
    }
    
    if (fileInputs.length === 0) {
      console.log('⚠️ REAL_FILE_MONITOR: No file inputs found on page')
    }
  }

  private async attachListenerToInput(input: HTMLInputElement): Promise<void> {
    if (this.attachedInputs.has(input)) {
      return
    }

    this.attachedInputs.add(input)

    input.addEventListener('change', async (event) => {
      console.log('🔍 REAL_FILE_INPUT: File input change event detected!')
      const inputElement = event.target as HTMLInputElement
      const files = inputElement.files
      console.log('🔍 REAL_FILE_INPUT: Files selected:', files?.length || 0)
      
      if (files?.length) {
        console.log('🔍 REAL_FILE_INPUT: File details:', Array.from(files).map(f => ({
          name: f.name,
          size: f.size,
          type: f.type
        })))
      }

      if (this.shouldSkipProcessing(inputElement)) {
        console.log('⚠️ REAL_FILE_INPUT: Skipping processing due to scannerSkipNext flag')
        return
      }
      
      if (!files?.length) {
        console.log('⚠️ REAL_FILE_INPUT: No files selected')
        return
      }

      console.log('🔍 REAL_FILE_INPUT: Processing files with FileGuard...')
      
      // Prevent default behavior initially to scan first
      event.stopImmediatePropagation()
      event.preventDefault()

      const shouldAllowUpload = await this.fileGuard.handleFileUpload(files, 'file input')
      console.log('🔍 REAL_FILE_INPUT: FileGuard result:', shouldAllowUpload)

      if (shouldAllowUpload) {
        console.log('✅ REAL_FILE_INPUT: Upload allowed, file will remain visible')
        // File scan successful - preserve file in input and allow upload to proceed
        // Files remain in input.files, so they'll stay visible in UI
        // Retrigger the change event to allow app to process the files
        this.retriggerFileUpload(input, files)
        // Add visual success indicator to file display
        this.addSuccessIndicatorToFile(input, files)
        // Note: input.value cannot be set for file inputs, but input.files already contains the files
        // The app should see the files when we dispatch the change event
      } else {
        console.log('❌ REAL_FILE_INPUT: Upload blocked, clearing input...')
        // Only clear input when blocked/failed
        input.value = ''
      }
    }, true)
  }

  private shouldSkipProcessing(input: HTMLInputElement): boolean {
    return input.dataset.scannerSkipNext === 'true'
  }

  private retriggerFileUpload(input: HTMLInputElement, files: FileList): void {
    input.dataset.scannerSkipNext = 'true'

    if (input.files?.length) {
      const newEvent = new Event('change', { bubbles: true, cancelable: true })
      
      setTimeout(() => {
        input.dispatchEvent(newEvent)
        setTimeout(() => {
          delete input.dataset.scannerSkipNext
        }, 100)
      }, 50)
    } else {
      delete input.dataset.scannerSkipNext
    }
  }

  private monitorDragDrop(): void {
    let processingDrop = false

    this.dropHandler = async (event: DragEvent) => {
      if (processingDrop) return

      const files = event.dataTransfer?.files
      if (!files?.length) return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      processingDrop = true

      try {
        const shouldAllowUpload = await this.fileGuard.handleFileUpload(files, 'drag & drop')

        if (shouldAllowUpload) {
          // File scan successful - transfer files to input and add success indicator
          this.transferFilesToInput(files)
          // Find the input that will receive the files and add success indicator
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
          if (fileInput) {
            this.addSuccessIndicatorToFile(fileInput, files)
          }
        }

        this.removeDragOverlay()
      } catch (error) {
        console.error('Error processing dropped files:', error)
      } finally {
        processingDrop = false
      }
    }

    this.dragoverHandler = (event: DragEvent) => {
      event.preventDefault()
    }

    document.addEventListener('drop', this.dropHandler, true)
    document.addEventListener('dragover', this.dragoverHandler, true)
  }

  private transferFilesToInput(files: FileList): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    if (!fileInput) return

    const dt = new DataTransfer()
    Array.from(files).forEach(file => dt.items.add(file))
    
    fileInput.files = dt.files
    fileInput.dataset.scannerSkipNext = 'true'
    
    fileInput.dispatchEvent(new Event('change', { bubbles: true }))
    
    setTimeout(() => {
      delete fileInput.dataset.scannerSkipNext
    }, 100)
  }

  /**
   * Add visual success indicator (✅ Safe/Allowed) to file display after successful scan
   */
  private addSuccessIndicatorToFile(input: HTMLInputElement, files: FileList): void {
    try {
      // Find file display elements (common patterns in chat/file upload UIs)
      // Look for file list containers, preview elements, or file name displays
      const fileDisplaySelectors = [
        '[data-testid*="file"]',
        '[class*="file"]',
        '[class*="upload"]',
        '[class*="attachment"]',
        '[role="list"]',
        '.file-list',
        '.upload-list',
        '.attachment-list'
      ]

      // Try to find file display container
      let fileContainer: Element | null = null
      for (const selector of fileDisplaySelectors) {
        const elements = document.querySelectorAll(selector)
        if (elements.length > 0) {
          // Find the one closest to the input
          for (const el of Array.from(elements)) {
            if (el.contains(input) || input.closest(selector)) {
              fileContainer = el
              break
            }
          }
          if (fileContainer) break
        }
      }

      // Also check parent containers of the input
      if (!fileContainer) {
        let parent = input.parentElement
        while (parent && parent !== document.body) {
          if (parent.classList.toString().includes('file') || 
              parent.classList.toString().includes('upload') ||
              parent.classList.toString().includes('attachment')) {
            fileContainer = parent
            break
          }
          parent = parent.parentElement
        }
      }

      // Add success indicators for each file
      Array.from(files).forEach((file, index) => {
        setTimeout(() => {
          // Find or create file display element
          const fileName = file.name
          const fileSize = (file.size / 1024).toFixed(1)
          
          // Try to find existing file display element by filename
          const fileElements = Array.from(document.querySelectorAll('*')).filter(el => {
            const text = el.textContent || ''
            return text.includes(fileName) || text.includes(file.name.split('.')[0])
          })

          // Add success indicator to found elements or create one
          fileElements.forEach(el => {
            // Check if indicator already exists
            if (el.querySelector('.file-scan-success-indicator')) {
              return
            }

            // Create success indicator
            const indicator = document.createElement('span')
            indicator.className = 'file-scan-success-indicator'
            indicator.style.cssText = `
              display: inline-flex;
              align-items: center;
              gap: 4px;
              margin-left: 8px;
              padding: 2px 6px;
              background-color: rgba(34, 197, 94, 0.15);
              color: #22c55e;
              border: 1px solid rgba(34, 197, 94, 0.3);
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
            `
            // indicator.textContent = '✅ Safe'
            indicator.title = `File scanned and allowed: ${fileName} (${fileSize} KB)`
            
            // Try to append to the file element or its parent
            if (el) {
              el.appendChild(indicator)
            } else if (fileContainer) {
              const fileLabel = document.createElement('div')
              fileLabel.style.cssText = `
                display: inline-flex;
                align-items: center;
                padding: 4px 8px;
                margin: 4px;
                background-color: rgba(30, 41, 59, 0.5);
                border-radius: 4px;
                font-size: 12px;
              `
              fileLabel.innerHTML = `
                <span>${fileName}</span>
                <span style="margin-left: 8px; color: #94a3b8; font-size: 10px;">(${fileSize} KB)</span>
                ${indicator.outerHTML}
              `
              fileContainer.appendChild(fileLabel)
            }
          })
        }, 100 + (index * 50)) // Stagger to avoid conflicts
      })
    } catch (error) {
      console.warn('Failed to add success indicator to file:', error)
      // Non-critical, continue
    }
  }

  private removeDragOverlay(): void {
    const dragOverlays = document.querySelectorAll('div.absolute.z-50.inset-0.flex.gap-2.flex-col.justify-center.items-center')
    
    for (const overlay of dragOverlays) {
      if (overlay.textContent?.includes('Add anything') || 
          overlay.textContent?.includes('Drop any file here')) {
        overlay.remove()
      }
    }

    const allDivs = document.querySelectorAll('div.absolute.z-50')
    for (const div of allDivs) {
      const svg = div.querySelector('svg[viewBox="0 0 132 108"]')
      if (svg) {
        div.remove()
      }
    }

    document.dispatchEvent(new DragEvent('dragleave', { bubbles: true }))
    document.dispatchEvent(new DragEvent('dragend', { bubbles: true }))
  }

  private monitorPaste(): void {
    this.pasteHandler = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return

      const files: File[] = []
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) {
            files.push(file)
          }
        }
      }

      if (files.length === 0) return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      const fileList = this.createFileList(files)
      const allowed = await this.fileGuard.handleFileUpload(fileList, 'paste')

      if (allowed) {
        // File scan successful - transfer files to input and add success indicator
        this.transferFilesToInput(fileList)
        // Find the input that received the files and add success indicator
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        if (fileInput) {
          this.addSuccessIndicatorToFile(fileInput, fileList)
        }
      }
    }

    document.addEventListener('paste', this.pasteHandler, true)
  }

  private createFileList(files: File[]): FileList {
    return {
      length: files.length,
      item: (index: number) => files[index] || null,
      [Symbol.iterator]: function* () {
        for (const file of files) {
          yield file
        }
      }
    } as FileList
  }

  private setupDOMObserver(): void {
    const startObserver = () => {
      if (!document.body) {
        console.log('🕇 FileUploadMonitor: document.body not ready, waiting...')
        setTimeout(startObserver, 100)
        return
      }

      console.log('✅ FileUploadMonitor: Starting DOM observer')
      this.domObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            console.log('🔍 REAL_FILE_MONITOR: DOM mutation detected, added nodes:', mutation.addedNodes.length)
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element
                console.log('🔍 REAL_FILE_MONITOR: Checking element for file inputs:', element.tagName)
                
                const fileInputs = element.querySelectorAll('input[type="file"]')
                if (fileInputs.length > 0) {
                  console.log('🔍 REAL_FILE_MONITOR: Found file inputs in new element:', fileInputs.length)
                }
                for (const input of fileInputs) {
                  console.log('🔍 REAL_FILE_MONITOR: Attaching listener to new input:', input)
                  this.attachListenerToInput(input as HTMLInputElement)
                }

                if (element.matches?.('input[type="file"]')) {
                  this.attachListenerToInput(element as HTMLInputElement)
                }
              }
            })
          }
        }
      })

      this.domObserver.observe(document.body, { childList: true, subtree: true })
    }

    startObserver()
  }

  private setupPeriodicCheck(): void {
    this.periodicCheckInterval = window.setInterval(() => {
      this.monitorExistingInputs()
    }, 2000)
  }

  setEnabled(enabled: boolean): void {
    this.fileGuard.setEnabled(enabled)
  }
  
  cleanup(): void {
    console.log('🧹 FileUploadMonitor: Cleaning up...')
    
    // Disconnect MutationObserver
    if (this.domObserver) {
      this.domObserver.disconnect()
      this.domObserver = null
    }
    
    // Clear periodic check interval
    if (this.periodicCheckInterval !== null) {
      clearInterval(this.periodicCheckInterval)
      this.periodicCheckInterval = null
    }
    
    // Remove event listeners
    if (this.dropHandler) {
      document.removeEventListener('drop', this.dropHandler, true)
      this.dropHandler = null
    }
    
    if (this.dragoverHandler) {
      document.removeEventListener('dragover', this.dragoverHandler, true)
      this.dragoverHandler = null
    }
    
    if (this.pasteHandler) {
      document.removeEventListener('paste', this.pasteHandler, true)
      this.pasteHandler = null
    }
    
    // Clear attached inputs
    this.attachedInputs.clear()
    
    console.log('✅ FileUploadMonitor: Cleanup complete')
  }
}