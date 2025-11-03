import React, { useState, useEffect, useMemo } from "react"
import type { PromptLog } from "~types"
import { loadPromptLogs, clearPromptLogs } from "~services/PromptLogService"

export default function PromptLogsPanel() {
  const [logs, setLogs] = useState<PromptLog[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | 'SUCCESS' | 'FAILURE'>('all')
  const [searchText, setSearchText] = useState('')

  // Load logs from storage on mount
  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true)
        const loadedLogs = await loadPromptLogs()
        setLogs(loadedLogs)
      } catch (error) {
        console.error('Failed to load prompt logs:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLogs()
  }, [])

  // Listen for PROMPT_LOG messages
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.kind === 'PROMPT_LOG') {
        // Prepend new log (newest first)
        setLogs(prev => [message.log, ...prev])
      } else if (message.kind === 'PROMPT_LOG_CLEAR') {
        setLogs([])
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [])

  // Filter logs based on type and search text
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Type filter
      if (typeFilter !== 'all' && log.type !== typeFilter) {
        return false
      }

      // Text search (case-insensitive) over prompt, reason, summary
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase()
        const matchesPrompt = log.prompt.toLowerCase().includes(searchLower)
        const matchesReason = log.reason.toLowerCase().includes(searchLower)
        const matchesSummary = log.summary.toLowerCase().includes(searchLower)
        
        if (!matchesPrompt && !matchesReason && !matchesSummary) {
          return false
        }
      }

      return true
    })
  }, [logs, typeFilter, searchText])

  const handleClearLogs = async () => {
    try {
      await clearPromptLogs()
      setLogs([])
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(new Date(timestamp))
  }

  if (loading) {
    return (
      <div className="bg-slate-800 bg-opacity-50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 h-full flex items-center justify-center">
        <div className="flex items-center text-white">
          <svg className="w-6 h-6 mr-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading prompt logs...
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 bg-opacity-50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Prompt Analysis Logs</h2>
        <button
          onClick={handleClearLogs}
          className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
          title="Clear logs"
        >
          <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search prompts, reasons, summaries..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | 'SUCCESS' | 'FAILURE')}
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Types</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILURE">Failure</option>
        </select>
      </div>

      {/* Logs List */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto custom-scrollbar space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
              <p>
                {logs.length === 0 
                  ? 'No prompt logs yet' 
                  : 'No logs match your filter'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`bg-slate-700 bg-opacity-50 rounded-xl p-4 border ${
                  log.type === 'SUCCESS' 
                    ? 'border-green-500/30 hover:bg-opacity-70' 
                    : 'border-red-500/30 hover:bg-opacity-70'
                } transition-colors`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {log.type === 'SUCCESS' ? (
                      <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-medium uppercase tracking-wide ${
                        log.type === 'SUCCESS' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {formatTime(log.timestamp)}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Prompt:</p>
                        <p className="text-sm text-slate-200 font-mono leading-relaxed break-words">
                          {log.prompt}
                        </p>
                      </div>
                      
                      {log.summary && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Summary:</p>
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {log.summary}
                          </p>
                        </div>
                      )}
                      
                      {log.reason && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Reason:</p>
                          <p className="text-sm text-red-300 leading-relaxed">
                            {log.reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-600">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {filteredLogs.length} of {logs.length} entries
            {searchText && ` (filtered)`}
          </span>
          <span>Newest first</span>
        </div>
      </div>
    </div>
  )
}

