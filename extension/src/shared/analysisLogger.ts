/**
 * Shared ESM logger for analysis logs
 * Uses chrome.runtime.sendMessage to avoid cross-bundle dynamic require issues
 * Safe to use from any bundle (content, prompt-guard, background)
 */

export type AnalysisLogEntry = {
  kind: 'PROMPT_ANALYSIS'
  status: 'SUCCESS' | 'FAILURE'
  message: string
  details?: any
  meta?: any // Meta field (e.g., promptPreview)
  ts?: string
}

/**
 * Log analysis event via chrome.runtime.sendMessage
 * This avoids dynamic require() that causes cross-bundle module resolution failures
 */
export async function logAnalysis(entry: AnalysisLogEntry): Promise<boolean> {
  try {
    // Use extension messaging only (no window require / no cross-bundle imports)
    await chrome.runtime.sendMessage({
      kind: 'ANALYSIS_LOG_ADD',
      entry: {
        ...entry,
        ts: entry.ts ?? new Date().toISOString(),
        // Pass meta field if provided (unified structure)
        ...(entry.meta ? { meta: entry.meta } : {})
      }
    })
    return true
  } catch (err) {
    console.error('Failed to log analysis via runtime message:', err)
    return false
  }
}

