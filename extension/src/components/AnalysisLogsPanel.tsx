import React, { useState, useEffect, useMemo } from "react"
import type { AnalysisLog, LogKind } from "~services/AnalysisLogService"

export default function AnalysisLogsPanel() {
  const [logs, setLogs] = useState<AnalysisLog[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | 'SUCCESS' | 'FAILURE'>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | LogKind>('all')
  const [searchText, setSearchText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const ITEMS_PER_PAGE = 3

  // Load logs on mount via runtime message
  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true)
        const response = await new Promise<any>((resolve) => {
          try {
            chrome.runtime.sendMessage({ kind: 'ANALYSIS_LOG_GET' }, (resp) => resolve(resp))
          } catch (e) {
            resolve({ ok: false, error: String(e) })
          }
        })
        if (response?.ok && Array.isArray(response.logs)) {
          // Include both PROMPT_ANALYSIS and FILE_ANALYSIS logs
          const analysisLogs = response.logs.filter((log: AnalysisLog) => 
            log.kind === 'PROMPT_ANALYSIS' || log.kind === 'FILE_ANALYSIS' || log.kind === 'FAILED_ANALYSIS'
          )
          setLogs(analysisLogs)
        }
      } catch (error) {
        console.error('Failed to load analysis logs:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLogs()
  }, [])

  // Listen for ANALYSIS_LOGS_UPDATED messages - instant UI updates
  useEffect(() => {
    const messageListener = async (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      if (message.kind === 'ANALYSIS_LOGS_UPDATED') {
        // Reload all logs from storage when updated
        try {
          const response = await new Promise<any>((resolve) => {
            try {
              chrome.runtime.sendMessage({ kind: 'ANALYSIS_LOG_GET' }, (resp) => resolve(resp))
            } catch (e) {
              resolve({ ok: false, error: String(e) })
            }
          })
          if (response?.ok && Array.isArray(response.logs)) {
            // Include both PROMPT_ANALYSIS, FILE_ANALYSIS, and FAILED_ANALYSIS logs
            const analysisLogs = response.logs.filter((log: AnalysisLog) => 
              log.kind === 'PROMPT_ANALYSIS' || log.kind === 'FILE_ANALYSIS' || log.kind === 'FAILED_ANALYSIS'
            )
            setLogs(analysisLogs)
          }
        } catch (error) {
          console.error('Failed to reload logs after update:', error)
        }
        return true
      }
      
      // Also handle ANALYSIS_LOG_APPEND for direct entry updates
      if (message.kind === 'ANALYSIS_LOG_APPEND') {
        const entry = message.entry as AnalysisLog
        
        // Show PROMPT_ANALYSIS, FILE_ANALYSIS, and FAILED_ANALYSIS
        if (entry.kind !== 'PROMPT_ANALYSIS' && entry.kind !== 'FILE_ANALYSIS' && entry.kind !== 'FAILED_ANALYSIS') {
          return true
        }
        
        // Normalize entry to unified format (handle both legacy and unified)
        const normalizedEntry: AnalysisLog = 'message' in entry && 'meta' in entry
          ? entry
          : {
              id: entry.id || (entry as any).id || String(Date.now()) + '-' + String(Math.random()),
              createdAt: entry.createdAt || (entry as any).timestamp || new Date().toISOString(),
              kind: entry.kind,
              status: entry.status,
              message: (entry as any).message || (entry as any).text || (entry as any).summary || 'Analysis completed',
              meta: {
                key: (entry as any).key,
                risk: (entry as any).risk,
                summary: (entry as any).summary,
                reason: (entry as any).reason,
                prompt: (entry as any).prompt,
                file: (entry as any).file,
                ...(entry as any).meta,
                ...(entry as any).json
              }
            }
        
        // Replace if same key/id exists, otherwise prepend (newest first)
        setLogs(prev => {
          const entryKey = normalizedEntry.meta?.key || normalizedEntry.id
          const filtered = prev.filter(log => {
            const logKey = log.meta?.key || log.id
            return logKey !== entryKey
          })
          // Sort by createdAt descending (newest first)
          const updated = [normalizedEntry, ...filtered].sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime()
            const timeB = new Date(b.createdAt).getTime()
            return timeB - timeA
          })
          return updated
        })
        
        // Preserve pagination position when new logs arrive (don't jump user off current page)
        // Only reset to page 1 when filters/search change (handled by useEffect)
        return true
      } else if (message.kind === 'ANALYSIS_LOG_CLEAR') {
        setLogs([])
        setCurrentPage(1)
        return true
      }
      return true // Required for async sendResponse
    }

    chrome.runtime.onMessage.addListener(messageListener)

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [])

  // Refresh on storage changes (chrome.storage.local)
  useEffect(() => {
    const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: 'sync' | 'local' | 'managed') => {
      if (area !== 'local') return
      if (Object.prototype.hasOwnProperty.call(changes, 'analysis-logs-v1')) {
        chrome.runtime.sendMessage({ kind: 'ANALYSIS_LOG_GET' }, (resp) => {
          if (resp?.ok && Array.isArray(resp.logs)) {
            // Include PROMPT_ANALYSIS, FILE_ANALYSIS, and FAILED_ANALYSIS logs
            const analysisLogs = resp.logs.filter((log: AnalysisLog) => 
              log.kind === 'PROMPT_ANALYSIS' || log.kind === 'FILE_ANALYSIS' || log.kind === 'FAILED_ANALYSIS'
            )
            setLogs(analysisLogs)
          }
        })
      }
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [])

  // Filter logs - show PROMPT_ANALYSIS only, suppress noise
  // Sort newest first
  const filteredLogs = useMemo(() => {
    // Noise filter - drop ACCESS/audit noise
    function isNoise(log: AnalysisLog): boolean {
      const text = log.message || (log as any).text || ''
      return /\[ACCESS\]/.test(text)
          || /\[audit\/event\]/i.test(text)
          || /\/api\/v1\/audit\/events/.test(text)
          || /API Success:/.test(text)
          || /User action:/.test(text)
          || /User login/.test(text)
          || /navigation/.test(text)
    }
    
    const filtered = logs.filter(log => {
      // Show PROMPT_ANALYSIS, FILE_ANALYSIS, and FAILED_ANALYSIS
      if (log.kind !== 'PROMPT_ANALYSIS' && log.kind !== 'FILE_ANALYSIS' && log.kind !== 'FAILED_ANALYSIS') {
        return false
      }
      
      // Suppress noise entries
      if (isNoise(log)) {
        return false
      }

      // Type filter (SUCCESS/FAILURE)
      if (typeFilter !== 'all' && log.status !== typeFilter) {
        return false
      }

      // Category filter
      if (categoryFilter !== 'all' && log.kind !== categoryFilter) {
        return false
      }

      // Text search (case-insensitive) over relevant fields
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase()
        const message = log.message || (log as any).text || ''
        const matchesMessage = message.toLowerCase().includes(searchLower)
        
        let matchesMeta = false
        if (log.kind === 'PROMPT_ANALYSIS') {
          const promptLower = (log.meta?.prompt || (log as any).prompt || '').toLowerCase()
          const summaryLower = (log.meta?.summary || (log as any).summary || '').toLowerCase()
          const reasonLower = (log.meta?.reason || (log as any).reason || '').toLowerCase()
          matchesMeta = promptLower.includes(searchLower) || 
                       summaryLower.includes(searchLower) || 
                       reasonLower.includes(searchLower)
        } else if (log.kind === 'FILE_ANALYSIS') {
          const fileName = (log.meta?.file?.name || (log as any).file?.name || '').toLowerCase()
          const summaryLower = (log.meta?.summary || (log as any).summary || '').toLowerCase()
          const reasonLower = (log.meta?.reason || (log as any).reason || '').toLowerCase()
          const correlationId = (log.meta?.correlationId || (log as any).correlationId || '').toLowerCase()
          matchesMeta = fileName.includes(searchLower) || 
                       summaryLower.includes(searchLower) || 
                       reasonLower.includes(searchLower) ||
                       correlationId.includes(searchLower)
        }
        
        if (!matchesMessage && !matchesMeta) {
          return false
        }
      }

      return true
    })
    
    // Sort by createdAt descending (newest first)
    return filtered.sort((a, b) => {
      const timeA = new Date(a.createdAt || (a as any).timestamp || 0).getTime()
      const timeB = new Date(b.createdAt || (b as any).timestamp || 0).getTime()
      return timeB - timeA
    })
  }, [logs, typeFilter, categoryFilter, searchText])

  // Reset to page 1 when filters/search change (without scrolling)
  useEffect(() => {
    setCurrentPage(1)
    // Don't scroll - just reset page state
  }, [typeFilter, categoryFilter, searchText])

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex)
  
  // Ensure currentPage is valid
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handleClearLogs = async () => {
    try {
      await chrome.runtime.sendMessage({ kind: 'ANALYSIS_LOG_CLEAR' })
      setLogs([])
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) {
      return 'Invalid date'
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date)
  }

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1))
  }

  const handlePageClick = (page: number) => {
    setCurrentPage(page)
  }

  // Generate page numbers with ellipsis when pages exceed 5
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages: (number | 'ellipsis')[] = []
    
    if (currentPage <= 3) {
      // Show first 3 pages, ellipsis, last page
      pages.push(1, 2, 3)
      if (totalPages > 4) {
        pages.push('ellipsis')
      }
      pages.push(totalPages)
    } else if (currentPage >= totalPages - 2) {
      // Show first page, ellipsis, last 3 pages
      pages.push(1)
      if (totalPages > 4) {
        pages.push('ellipsis')
      }
      pages.push(totalPages - 2, totalPages - 1, totalPages)
    } else {
      // Show first page, ellipsis, current-1, current, current+1, ellipsis, last page
      pages.push(1)
      if (currentPage > 3) {
        pages.push('ellipsis')
      }
      pages.push(currentPage - 1, currentPage, currentPage + 1)
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
      }
      pages.push(totalPages)
    }
    
    return pages
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-6 bg-opacity-50 border bg-slate-800 backdrop-blur-sm rounded-2xl border-slate-700">
        <div className="flex items-center text-white">
          <svg className="w-6 h-6 mr-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading analysis logs...
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-6 bg-opacity-50 border bg-slate-800 backdrop-blur-sm rounded-2xl border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Analysis Logs</h2>
        <button
          onClick={handleClearLogs}
          className="p-2 transition-colors rounded-lg bg-slate-700 hover:bg-slate-600"
          title="Clear logs"
        >
          <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-4 sm:flex-row">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search prompts, files, summaries, reasons..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full px-4 py-2 text-sm text-white border rounded-lg bg-slate-700 border-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | 'SUCCESS' | 'FAILURE')}
          className="px-3 py-2 text-sm text-white border rounded-lg bg-slate-700 border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Status</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILURE">Failure</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as 'all' | LogKind)}
          className="px-3 py-2 text-sm text-white border rounded-lg bg-slate-700 border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Types</option>
          <option value="PROMPT_ANALYSIS">Prompts</option>
          <option value="FILE_ANALYSIS">Files</option>
          <option value="FAILED_ANALYSIS">Failed</option>
        </select>
      </div>

      {/* Compact counter above list */}
      {filteredLogs.length > 0 && (
        <div className="mb-3 text-xs text-slate-400">
          {startIndex + 1}–{Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length}
          {filteredLogs.length < logs.length && ' (' + logs.length + ' total)'}
        </div>
      )}

      {/* Logs List */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full space-y-3 overflow-y-auto custom-scrollbar">
          {paginatedLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
              <p>
                {logs.length === 0 
                  ? 'No analysis logs yet' 
                  : 'No logs match your filter'}
              </p>
            </div>
          ) : (
            paginatedLogs.map((log) => {
              // Normalize log to unified format for display
              // Structure: { id, createdAt, kind, status, message, meta, details }
              const normalizedLog: AnalysisLog & { details?: any } = 'message' in log && 'meta' in log
                ? { ...log, details: (log as any).details || {} }
                : {
                    ...log,
                    createdAt: (log as any).timestamp || log.createdAt || new Date().toISOString(),
                    message: log.message || (log as any).text || (log as any).summary || 'Analysis completed',
                    meta: {
                      ...(log as any).meta,
                      key: (log as any).key,
                      risk: (log as any).risk,
                      summary: (log as any).summary,
                      reason: (log as any).reason,
                      prompt: (log as any).prompt,
                      file: (log as any).file,
                      ...(log as any).json
                    },
                    details: (log as any).details || (log as any).json || {}
                  } as AnalysisLog & { details?: any }
              
              return (
              <div
                key={log.id}
                className={`bg-slate-700 bg-opacity-50 rounded-xl p-4 border ${
                  log.status === 'SUCCESS' 
                    ? 'border-green-500/30 hover:bg-opacity-70' 
                    : 'border-red-500/30 hover:bg-opacity-70'
                } transition-colors`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                   
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-medium uppercase tracking-wide ${
                          normalizedLog.status === 'SUCCESS' ? 'text-green-400' : 
                          normalizedLog.status === 'FAILURE' ? 'text-red-400' : 'text-slate-400'
                        }`}>
                          {normalizedLog.status}
                        </span>
                        <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-600 rounded">
                          {normalizedLog.kind === 'FILE_ANALYSIS' ? 'File' : normalizedLog.kind === 'FAILED_ANALYSIS' ? 'Failed' : 'Prompt'}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-slate-400">
                        {formatTime(normalizedLog.createdAt)}
                      </span>
                    </div>
                    
                    {/* Message (human-readable) */}
                    <div className="mb-3">
                      <p className="font-mono text-sm leading-relaxed break-words text-slate-200">
                        {normalizedLog.message}
                      </p>
                    </div>

                    {/* Expand/collapse button */}
                    {normalizedLog.details?.prompt && (
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedLogs)
                          if (newExpanded.has(normalizedLog.id)) {
                            newExpanded.delete(normalizedLog.id)
                          } else {
                            newExpanded.add(normalizedLog.id)
                          }
                          setExpandedLogs(newExpanded)
                        }}
                        className="mb-2 text-xs text-slate-400 hover:text-slate-300 underline cursor-pointer"
                        aria-label={expandedLogs.has(normalizedLog.id) ? 'Collapse details' : 'Expand details'}
                      >
                        {expandedLogs.has(normalizedLog.id) ? ' Collapse' : ' Expand'}
                      </button>
                    )}

                    {/* Structured details from meta */}
                    <div className="space-y-2 text-xs">
                      {normalizedLog.kind === 'PROMPT_ANALYSIS' && (
                        <div>
                          <span className="text-slate-400">Prompt:</span>
                          <span className="ml-2 font-mono text-slate-300">
                            {normalizedLog.meta?.promptPreview 
                              ? normalizedLog.meta.promptPreview 
                              : normalizedLog.meta?.prompt 
                              ? (normalizedLog.meta.prompt.substring(0, 200) + (normalizedLog.meta.prompt.length > 200 ? '...' : '')) 
                              : normalizedLog.details?.prompt
                              ? (normalizedLog.details.prompt.substring(0, 200).replace(/\n/g, ' ').trim() + (normalizedLog.details.prompt.length > 200 ? '...' : ''))
                              : 'N/A'}
                          </span>
                          {expandedLogs.has(normalizedLog.id) && normalizedLog.details?.prompt && (
                            <div className="mt-1 text-xs text-slate-500 border-l-2 border-slate-600 pl-2">
                              <span className="text-slate-400">Full prompt:</span>
                              <span className="ml-2 font-mono text-slate-400 break-words block mt-1 whitespace-pre-wrap">
                                {normalizedLog.details.prompt}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {normalizedLog.kind === 'FILE_ANALYSIS' && (
                        <div>
                          <span className="text-slate-400">File:</span>
                          <span className="ml-2 font-mono text-slate-300">
                            {normalizedLog.meta?.file?.name || (normalizedLog as any).file?.name || 'N/A'}
                          </span>
                          {normalizedLog.meta?.file?.size && (
                            <span className="ml-2 text-slate-500">
                              ({(normalizedLog.meta.file.size / 1024).toFixed(2)} KB)
                            </span>
                          )}
                          {normalizedLog.meta?.file?.mime && (
                            <span className="ml-2 text-slate-500">
                              {normalizedLog.meta.file.mime}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {normalizedLog.meta?.risk && (
                        <div>
                          <span className="text-slate-400">Risk:</span>
                          <span className={`ml-2 ${
                            normalizedLog.meta.risk === 'high' ? 'text-red-300' : 
                            normalizedLog.meta.risk === 'medium' ? 'text-yellow-300' : 
                            normalizedLog.meta.risk === 'low' ? 'text-blue-300' : 
                            'text-green-300'
                          }`}>
                            {normalizedLog.meta.risk}
                          </span>
                        </div>
                      )}
                      
                      {normalizedLog.meta?.summary && (
                        <div>
                          <span className="text-slate-400">Summary:</span>
                          <span className="ml-2 text-slate-300">{normalizedLog.meta.summary}</span>
                        </div>
                      )}
                      
                      {normalizedLog.meta?.correlationId && (
                        <div>
                          <span className="text-slate-400">Correlation ID:</span>
                          <span className="ml-2 font-mono text-slate-400 text-xs">
                            {normalizedLog.meta.correlationId}
                          </span>
                        </div>
                      )}
                      
                      {normalizedLog.meta?.reason && normalizedLog.meta.reason !== '-' && normalizedLog.meta.reason !== '' && (
                        <div>
                          <span className="text-slate-400">Reason:</span>
                          <span className={`ml-2 ${normalizedLog.status === 'FAILURE' ? 'text-red-300' : 'text-slate-300'}`}>
                            {normalizedLog.meta.reason}
                          </span>
                        </div>
                      )}
                      
                      {normalizedLog.meta?.signals && Array.isArray(normalizedLog.meta.signals) && normalizedLog.meta.signals.length > 0 && (
                        <div>
                          <span className="text-slate-400">Signals:</span>
                          <span className="ml-2 text-slate-300">{normalizedLog.meta.signals.join(', ')}</span>
                        </div>
                      )}
                      
                      {normalizedLog.kind === 'FILE_ANALYSIS' && normalizedLog.meta?.file?.hash && (
                        <div>
                          <span className="text-slate-400">File Hash:</span>
                          <span className="ml-2 font-mono text-slate-400 text-xs">
                            {normalizedLog.meta.file.hash.substring(0, 16)}...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              )
            })
          )}
        </div>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pt-4 mt-4 border-t border-slate-600">
          <div className="flex items-center justify-center space-x-1">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (currentPage > 1) {
                    handlePreviousPage()
                  }
                }
              }}
              aria-label="Previous page"
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                currentPage === 1
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              Prev
            </button>
            
            {getPageNumbers().map((page, index) => {
              if (page === 'ellipsis') {
                return (
                  <span key={`ellipsis-${index}`} className="px-2 text-xs text-slate-400">
                    …
                  </span>
                )
              }
              
              const isActive = page === currentPage
              return (
                <button
                  key={page}
                  onClick={() => handlePageClick(page)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handlePageClick(page)
                    }
                  }}
                  aria-label={`Page ${page}${isActive ? ' (current)' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-w-[2rem] px-2 py-1 text-xs rounded-lg transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white font-medium'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  }`}
                >
                  {page}
                </button>
              )
            })}
            
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (currentPage < totalPages) {
                    handleNextPage()
                  }
                }
              }}
              aria-label="Next page"
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                currentPage === totalPages
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

