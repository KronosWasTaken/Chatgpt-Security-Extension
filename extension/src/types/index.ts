export interface LogEntry {
  id: string
  timestamp: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  category?: 'prompt_injection' | 'pii' | 'file_scan' | 'system'
}

export interface AdvancedSettings {
  blockEnvFiles: boolean
  realTimeScanning: boolean
  debugMode: boolean
  scanExecutables: boolean
}

export interface Config {
  isEnabled: boolean
  apiKey: string
  geminiApiKey: string 
  advancedSettings: AdvancedSettings
}

export interface StorageData {
  config: Config
  logs: LogEntry[]
}