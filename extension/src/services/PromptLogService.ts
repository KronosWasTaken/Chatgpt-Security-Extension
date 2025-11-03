/**
 * Service for managing prompt analysis logs
 * Handles persistence to chrome.storage.local and message broadcasting
 */
import type { PromptLog } from "~types"

const STORAGE_KEY = 'prompt-logs-v1'
const MAX_LOGS = 2000 // Limit to prevent storage bloat

let writeDebounceTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 300

/**
 * Generate unique ID for log entry
 */
function generateLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Load prompt logs from storage
 */
export async function loadPromptLogs(): Promise<PromptLog[]> {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY])
    const logs = result[STORAGE_KEY] || []
    
    // Backward compatibility: tolerate missing summary/reason
    return logs.map((log: any) => ({
      id: log.id || generateLogId(),
      timestamp: log.timestamp || new Date().toISOString(),
      type: log.type || 'SUCCESS',
      prompt: log.prompt || '',
      summary: log.summary || '',
      reason: log.reason || ''
    }))
  } catch (error) {
    console.error('Failed to load prompt logs:', error)
    return []
  }
}

/**
 * Save prompt logs to storage (with debouncing)
 */
async function savePromptLogs(logs: PromptLog[]): Promise<void> {
  try {
    // Limit to MAX_LOGS, newest first
    const limitedLogs = logs.slice(0, MAX_LOGS)
    await chrome.storage.local.set({ [STORAGE_KEY]: limitedLogs })
  } catch (error) {
    console.error('Failed to save prompt logs:', error)
  }
}

/**
 * Debounced save function
 */
function debouncedSave(logs: PromptLog[]): void {
  if (writeDebounceTimer !== null) {
    clearTimeout(writeDebounceTimer)
  }
  
  writeDebounceTimer = setTimeout(() => {
    savePromptLogs(logs)
    writeDebounceTimer = null
  }, DEBOUNCE_MS)
}

/**
 * Add a new prompt log entry
 */
export async function addPromptLog(log: Omit<PromptLog, 'id' | 'timestamp'>): Promise<PromptLog> {
  const fullLog: PromptLog = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    ...log
  }
  
  // Load existing logs
  const existingLogs = await loadPromptLogs()
  
  // Prepend new log (newest first)
  const updatedLogs = [fullLog, ...existingLogs]
  
  // Save with debouncing
  debouncedSave(updatedLogs)
  
  // Broadcast via runtime message
  try {
    chrome.runtime.sendMessage({
      kind: 'PROMPT_LOG',
      log: fullLog
    }).catch(() => {
      // Ignore errors if no listeners
    })
  } catch (error) {
    console.error('Failed to broadcast prompt log:', error)
  }
  
  return fullLog
}

/**
 * Clear all prompt logs
 */
export async function clearPromptLogs(): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: [] })
    
    // Broadcast clear event
    try {
      chrome.runtime.sendMessage({
        kind: 'PROMPT_LOG_CLEAR'
      }).catch(() => {})
    } catch (error) {
      console.error('Failed to broadcast clear event:', error)
    }
  } catch (error) {
    console.error('Failed to clear prompt logs:', error)
  }
}

