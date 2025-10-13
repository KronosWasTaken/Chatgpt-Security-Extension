import { FileGuard } from '../guards/FileGuard'

export class FileUploadMonitor {
  private fileGuard = new FileGuard()
  private attachedInputs = new Set<HTMLInputElement>()

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
      this.attachListenerToInput(input as HTMLInputElement)
    }
    
    if (fileInputs.length === 0) {
      console.log('⚠️ REAL_FILE_MONITOR: No file inputs found on page')
    }
  }

  private attachListenerToInput(input: HTMLInputElement): void {
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
      event.stopImmediatePropagation()
      event.preventDefault()

      const shouldAllowUpload = await this.fileGuard.handleFileUpload(files, 'file input')
      console.log('🔍 REAL_FILE_INPUT: FileGuard result:', shouldAllowUpload)

      if (shouldAllowUpload) {
        console.log('✅ REAL_FILE_INPUT: Upload allowed, retriggering...')
        this.retriggerFileUpload(input, files)
      } else {
        console.log('❌ REAL_FILE_INPUT: Upload blocked, clearing input...')
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