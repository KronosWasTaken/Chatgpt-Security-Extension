import { FileGuard } from '../guards/FileGuard'

export class FileUploadMonitor {
  private fileGuard = new FileGuard()
  private attachedInputs = new Set<HTMLInputElement>()

  initialize(): void {
    this.monitorExistingInputs()
    this.monitorDragDrop()
    this.monitorPaste()
    this.setupDOMObserver()
    this.setupPeriodicCheck()
  }

  private monitorExistingInputs(): void {
    const fileInputs = document.querySelectorAll('input[type="file"]')
    
    for (const input of fileInputs) {
      this.attachListenerToInput(input as HTMLInputElement)
    }
  }

  private attachListenerToInput(input: HTMLInputElement): void {
    if (this.attachedInputs.has(input)) {
      return
    }

    this.attachedInputs.add(input)

    input.addEventListener('change', async (event) => {
      const inputElement = event.target as HTMLInputElement
      const files = inputElement.files

      if (this.shouldSkipProcessing(inputElement) || !files?.length) {
        return
      }

      event.stopImmediatePropagation()
      event.preventDefault()

      const shouldAllowUpload = await this.fileGuard.handleFileUpload(files, 'file input')

      if (shouldAllowUpload) {
        this.retriggerFileUpload(input, files)
      } else {
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

    document.addEventListener('drop', async (event) => {
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
          this.transferFilesToInput(files)
        }

        this.removeDragOverlay()
      } catch (error) {
        console.error('Error processing dropped files:', error)
      } finally {
        processingDrop = false
      }
    }, true)

    document.addEventListener('dragover', (event) => {
      event.preventDefault()
    }, true)
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
    document.addEventListener('paste', async (event) => {
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
        this.transferFilesToInput(fileList)
      }
    }, true)
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
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element
                
                const fileInputs = element.querySelectorAll('input[type="file"]')
                for (const input of fileInputs) {
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

      observer.observe(document.body, { childList: true, subtree: true })
    }

    startObserver()
  }

  private setupPeriodicCheck(): void {
    setInterval(() => {
      this.monitorExistingInputs()
    }, 2000)
  }

  setEnabled(enabled: boolean): void {
    this.fileGuard.setEnabled(enabled)
  }
}