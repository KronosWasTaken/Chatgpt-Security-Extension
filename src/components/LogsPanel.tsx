import React, { useState } from "react"
import type { LogEntry } from "~types"

interface LogsPanelProps {
  logs: LogEntry[]
  onClearLogs: () => void
  onRefreshLogs?: () => void
}

export default function LogsPanel({ logs, onClearLogs, onRefreshLogs }: LogsPanelProps) {
  const [filter, setFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const filteredLogs = logs.filter(log => {
    const typeMatch = filter === 'all' || log.type === filter
    const categoryMatch = categoryFilter === 'all' || log.category === categoryFilter
    return typeMatch && categoryMatch
  })

  const handleClearLogs = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' })
      onClearLogs()
    } catch (error) {
      console.error('Error clearing logs:', error)
      onClearLogs()
    }
  }

  const handleRefreshLogs = async () => {
    if (onRefreshLogs) {
      onRefreshLogs()
    }
  }

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        )
    }
  }

  const formatTime = (timestamp: string) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(new Date(timestamp))
  }

  return (
    <div className="bg-slate-800 bg-opacity-50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Logs</h2>
        <div className="flex items-center space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Types</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All</option>
            <option value="prompt_injection">Blocked Prompts</option>
            <option value="pii">Blocked PII</option>
            <option value="file_scan">Files</option>
          </select>
          <button
            onClick={handleClearLogs}
            className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
            title="Clear logs"
          >
            <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
            </svg>
          </button>
          <button
            onClick={handleRefreshLogs}
            className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
            title="Refresh logs"
          >
            <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="mb-2 text-xs text-slate-500">
          Debug: {logs.length} logs loaded, type: {filter}, category: {categoryFilter}
        </div>
        
        <div className="h-full overflow-y-auto custom-scrollbar space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
              <p>No logs to display</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-700 bg-opacity-50 rounded-xl p-4 border border-slate-600 hover:bg-opacity-70 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getLogIcon(log.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium uppercase tracking-wide ${
                        log.type === 'success' ? 'text-green-400' :
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'warning' ? 'text-yellow-400' :
                        'text-blue-400'
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {formatTime(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 font-mono leading-relaxed">
                      {log.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-600">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{filteredLogs.length} entries</span>
          <span>Last updated: {formatTime(new Date().toISOString())}</span>
        </div>
      </div>
    </div>
  )
}