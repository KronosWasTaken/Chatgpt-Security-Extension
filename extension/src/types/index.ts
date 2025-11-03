export interface LogEntry {
  id: string
  timestamp: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  category?: 'prompt_injection' | 'pii' | 'file_scan' | 'system' | 'api'
}

export interface PromptLog {
  id: string
  timestamp: string // ISO format
  type: 'SUCCESS' | 'FAILURE'
  prompt: string
  summary: string
  reason: string // Required for FAILURE, optional/empty for SUCCESS
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

export interface AuthUser {
  email: string
  token: string
  loginTime: string
  userInfo?: {
    user_id: string
    email: string
    name: string
    role: string
    msp_id?: string
    client_id?: string
    department?: string
    permissions: string[]
  }
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface StorageData {
  config: Config
  logs: LogEntry[]
  authUser?: AuthUser
}