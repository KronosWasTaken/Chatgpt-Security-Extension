/**
 * Analysis Log Service - Handles one-log-per-item analysis logs
 * Provides deduplication, persistence, and runtime message bridge
 */
import { nanoid } from 'nanoid'

export type LogStatus = 'SUCCESS' | 'FAILURE'
export type LogKind = 'PROMPT_ANALYSIS' | 'FILE_ANALYSIS' | 'FAILED_ANALYSIS'

/**
 * Analysis log structure for PROMPT_ANALYSIS, FILE_ANALYSIS, and PROMPT_FLOW
 * All logs stored in same local storage array, sorted by createdAt desc
 */
export interface AnalysisLog {
  id: string
  createdAt: string // ISO format timestamp (renamed from timestamp for consistency)
  kind: LogKind
  status: LogStatus
  message: string // Clear descriptive message (e.g., "Prompt analysis complete" or "File blocked: name - reason")
  meta: {
    // Dedup key for deduplication
    key?: string
    // Risk assessment
    risk?: 'none' | 'low' | 'medium' | 'high'
    // Summary/reason (for UI display)
    summary?: string
    reason?: string
    // Duration in milliseconds
    durationMs?: number
    // Prompt-specific fields
    prompt?: string
    // Prompt preview (first 200 chars, no newlines)
    promptPreview?: string
    promptLength?: number
    model?: string
    // File-specific fields
    file?: {
      name: string
      size: number
      mime?: string
      hash?: string
    }
    // Result details
    result?: {
      riskLevel?: string
      summary?: string
      threats?: string[]
      shouldBlock?: boolean
    }
    // Error details
    error?: {
      code?: number
      message?: string
      responseBody?: any
    }
    // Additional structured data
    [key: string]: any
  }
  // Details field for full original data (e.g., full prompt text)
  details?: {
    prompt?: string // Full original prompt text
    [key: string]: any
  }
}

const STORAGE_KEY = 'analysis-logs-v1'
const MAX_LOGS = 2000

// In-memory mirror for quick reads
let memLogs: AnalysisLog[] | null = null

/**
 * Compute SHA-256 hash of string
 */
export async function sha256String(s: string): Promise<string> {
  const enc = new TextEncoder().encode(s)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Compute SHA-256 hash of file content
 */
export async function sha256File(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const dig = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(dig)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate deduplication key for prompt
 */
export async function generatePromptKey(prompt: string): Promise<string> {
  const hash = await sha256String(prompt)
  return `P:${hash}`
}

// generateFileKey removed - file analysis logging removed

/**
 * Load logs from storage and hydrate memory
 */
export async function loadAnalysisLogs(): Promise<AnalysisLog[]> {
  if (memLogs !== null) {
    return memLogs
  }

  try {
    const result = await chrome.storage.local.get([STORAGE_KEY])
    const logs = result[STORAGE_KEY] || []
    memLogs = logs
    return logs
  } catch (error) {
    console.error('Failed to load analysis logs:', error)
    memLogs = []
    return []
  }
}

/**
 * Save logs to storage and update memory (newest first)
 */
export async function saveAnalysisLogs(logs: AnalysisLog[]): Promise<void> {
  try {
    // Limit to MAX_LOGS, keep newest first
    const limitedLogs = logs.slice(0, MAX_LOGS)
    await chrome.storage.local.set({ [STORAGE_KEY]: limitedLogs })
    memLogs = limitedLogs
    // Broadcast update for any listeners (side panel, etc.)
    try {
      chrome.runtime.sendMessage({ kind: 'ANALYSIS_LOGS_UPDATED' }).catch(() => {})
    } catch (_) {}
  } catch (error) {
    console.error('Failed to save analysis logs:', error)
  }
}

/**
 * Append or replace analysis log entry (deduplicated by key)
 * Accepts either unified format or legacy format for backward compatibility
 */
export async function appendAnalysisLog(
  entry: Omit<AnalysisLog, 'id' | 'createdAt'> | {
    // Legacy format support
    kind?: LogKind
    status?: LogStatus
    key?: string
    risk?: 'none' | 'low' | 'medium' | 'high'
    summary?: string
    reason?: string
    text?: string
    timestamp?: string
    prompt?: string
    file?: { name: string; size: number; mime?: string; hash?: string }
    json?: Record<string, any>
    correlationId?: string
    durationMs?: number
    result?: any
    error?: any
    message?: string
    meta?: any
  }
): Promise<AnalysisLog> {
  // Normalize entry to unified format
  const isUnifiedFormat = 'message' in entry && 'meta' in entry && typeof entry.meta === 'object'
  
  let fullEntry: AnalysisLog
  if (isUnifiedFormat) {
    // Already in unified format
    fullEntry = {
      id: nanoid(),
      createdAt: entry.createdAt || new Date().toISOString(),
      kind: entry.kind || 'PROMPT_ANALYSIS',
      status: entry.status || 'SUCCESS',
      message: entry.message || 'Analysis completed',
      meta: {
        key: entry.meta?.key || `${entry.kind || 'UNKNOWN'}:${Date.now()}`,
        ...entry.meta
      },
      details: (entry as any).details || undefined,
      ...entry
    } as AnalysisLog
  } else {
    // Legacy format - convert to unified
    const legacyEntry = entry as any
    const dedupKey = legacyEntry.key || `${legacyEntry.kind || 'UNKNOWN'}:${Date.now()}`
    const message = legacyEntry.message || legacyEntry.text || legacyEntry.summary || 
      (legacyEntry.status === 'SUCCESS' 
        ? 'Prompt analysis complete'
        : legacyEntry.status === 'FAILURE'
        ? 'Prompt analysis failed'
        : 'Analysis completed')
    
    fullEntry = {
      id: nanoid(),
      createdAt: legacyEntry.timestamp || legacyEntry.createdAt || new Date().toISOString(),
      kind: legacyEntry.kind || 'PROMPT_ANALYSIS',
      status: legacyEntry.status || 'SUCCESS',
      message,
      meta: {
        key: dedupKey,
        risk: legacyEntry.risk || 'none',
        summary: legacyEntry.summary || '',
        reason: legacyEntry.reason || '',
        durationMs: legacyEntry.durationMs,
        prompt: legacyEntry.prompt,
        file: legacyEntry.file,
        result: legacyEntry.result,
        error: legacyEntry.error,
        correlationId: legacyEntry.correlationId || legacyEntry.json?.correlationId, // Extract correlationId from legacy entry
        timestamp: legacyEntry.timestamp || legacyEntry.createdAt || new Date().toISOString(), // Ensure timestamp is in meta
        ...legacyEntry.json // Merge json fields into meta (includes correlationId if present)
      }
    }
  }

  // Load existing logs
  const existingLogs = await loadAnalysisLogs()

  // Remove any existing entry with the same key (deduplication)
  // Also check for duplicates based on (kind, correlationId, createdAt±1s, message)
  const logKey = fullEntry.meta?.key || fullEntry.id
  const correlationId = fullEntry.meta?.correlationId || fullEntry.details?.correlationId
  const createdAt = new Date(fullEntry.createdAt || 0).getTime()
  const message = fullEntry.message || ''
  
  const filteredLogs = existingLogs.filter(log => {
    const existingKey = log.meta?.key || log.id
    // Primary deduplication: by key
    if (existingKey === logKey) {
      return false
    }
    
    // Secondary deduplication: by (kind, correlationId, createdAt±1s, message)
    // This prevents duplicates on rapid retries
    if (correlationId && log.meta?.correlationId === correlationId && 
        log.kind === fullEntry.kind && 
        log.message === message) {
      const existingTime = new Date(log.createdAt || 0).getTime()
      const timeDiff = Math.abs(existingTime - createdAt)
      // If created within 1 second with same kind, correlationId, and message, consider it duplicate
      if (timeDiff <= 1000) {
        return false
      }
    }
    
    return true
  })

  // Prepend new entry (newest first) - sort by createdAt descending
  const updatedLogs = [fullEntry, ...filteredLogs].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.meta?.timestamp || 0).getTime()
    const timeB = new Date(b.createdAt || b.meta?.timestamp || 0).getTime()
    return timeB - timeA // Newest first
  })

  // Save
  await saveAnalysisLogs(updatedLogs)

  // Broadcast via runtime message for instant UI updates
  try {
    chrome.runtime.sendMessage({
      kind: 'ANALYSIS_LOG_APPEND',
      entry: fullEntry
    }).catch(() => {
      // Ignore if no listeners (background may not be ready)
    })
    
    // Also broadcast general update
    chrome.runtime.sendMessage({
      kind: 'ANALYSIS_LOGS_UPDATED'
    }).catch(() => {
      // Ignore if no listeners
    })
  } catch (error) {
    // Log error but don't break the flow
    console.error('Failed to broadcast analysis log:', error)
  }

  return fullEntry
}

/**
 * Get all analysis logs (newest first)
 */
export async function getAnalysisLogs(): Promise<AnalysisLog[]> {
  return await loadAnalysisLogs()
}

/**
 * Clear all analysis logs
 */
export async function clearAnalysisLogs(): Promise<void> {
  await saveAnalysisLogs([])
  
  // Broadcast clear
  try {
    chrome.runtime.sendMessage({
      kind: 'ANALYSIS_LOG_CLEAR'
    }).catch(() => {})
  } catch (error) {
    console.error('Failed to broadcast clear:', error)
  }
}

/**
 * Invalidate cache (force reload from storage)
 */
export function invalidateCache(): void {
  memLogs = null
}
