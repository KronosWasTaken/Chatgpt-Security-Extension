import React, { useState, useEffect } from "react"
import StatusToggle from "~components/StatusToggle"
import ConfigPanel from "~components/ConfigPanel"
import { BackendConfigPanel } from "~components/BackendConfigPanel"
import LogsPanel from "~components/LogsPanel"
import LoginPage from "~components/LoginPage"
import { useConfig, useLogs } from "~hooks/useStorage"
import { useAuth } from "~hooks/useAuth"
import type { LogEntry } from "~types"
import "~style.css"

export default function SidePanel() {
  console.log('SidePanel component rendering')
  
  const { user, loading: authLoading, login, logout, clearAuth, isAuthenticated } = useAuth()
  const [config, updateConfig, configLoading] = useConfig()
  const [logs, updateLogs, logsLoading] = useLogs()
  
  console.log('🔐 SIDEPANEL: Loading states:', { authLoading, configLoading, logsLoading })
  console.log('🔐 SIDEPANEL: Auth user:', user)
  console.log('🔐 SIDEPANEL: Is authenticated:', isAuthenticated())
  console.log('🔐 SIDEPANEL: Config:', config)
  console.log('🔐 SIDEPANEL: Logs:', logs)

  const refreshLogsFromStorage = async () => {
    try {
      const result = await chrome.storage.sync.get(['logs'])
      console.log('Manual refresh: Found', result.logs?.length || 0, 'logs in storage')
      if (result.logs) {
        updateLogs(result.logs)
      }
    } catch (error) {
      console.error('Error refreshing logs:', error)
    }
  }

  useEffect(() => {
    const interval = setInterval(refreshLogsFromStorage, 2000)
    refreshLogsFromStorage()
    return () => clearInterval(interval)
  }, [])

  // Show loading state while checking authentication
  if (authLoading) {
    console.log('🔐 SIDEPANEL: Showing auth loading state...')
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </div>
      </div>
    )
  }

  // Show login page if not authenticated
  const authenticated = isAuthenticated()
  console.log('🔐 SIDEPANEL: Authentication check result:', authenticated)
  
  if (!authenticated) {
    console.log('🔐 SIDEPANEL: User not authenticated, showing login page')
    return <LoginPage onLogin={login} loading={authLoading} />
  }

  // Show loading state for config/logs if authenticated
  if (configLoading || logsLoading) {
    console.log('Showing loading state...')
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </div>
      </div>
    )
  }

  console.log('Rendering main UI...')

  const handleToggle = (enabled: boolean) => {
    const newConfig = { ...config, isEnabled: enabled }
    updateConfig(newConfig)
    
    chrome.runtime.sendMessage({
      type: 'SAVE_CONFIG',
      config: newConfig
    })
  }

  const handleConfigSave = async () => {
    console.log('Configuration saved:', config)
    console.log('API Key length:', config.apiKey.length)
    
    const storageData = await chrome.storage.sync.get(['config'])
    console.log('Storage contents:', storageData)
    
    chrome.runtime.sendMessage({
      type: 'SAVE_CONFIG',
      config: config
    }, (response) => {
      console.log('Config save response:', response)
    })
  }

  const handleClearLogs = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' })
      updateLogs([])
    } catch (error) {
      console.error('Error clearing logs:', error)
      updateLogs([])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900 text-white">
      {/* Compact Header for Side Panel */}
      <div className="bg-slate-800 bg-opacity-50 backdrop-blur-sm border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Security Scanner</h1>
              <p className="text-xs text-slate-400">File Upload Protection</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                config.isEnabled ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <span className="text-xs text-slate-400">
                {config.isEnabled ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={clearAuth}
                className="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 rounded text-white"
                title="Clear auth state (debug)"
              >
                Clear Auth
              </button>
              <button
                onClick={logout}
                className="flex items-center space-x-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-xs text-slate-300 hover:text-white"
                title={`Logged in as ${user?.email}`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-4 p-4">
        <StatusToggle 
          isEnabled={config.isEnabled} 
          onToggle={handleToggle}
        />
        
        <ConfigPanel
          config={config}
          onConfigChange={updateConfig}
          onSave={handleConfigSave}
        />
        
        <BackendConfigPanel
          isExtensionEnabled={config.isEnabled}
          onConfigChange={(backendConfig) => {
            console.log('Backend config updated:', backendConfig)
          }}
        />

        <LogsPanel 
          logs={logs}
          onClearLogs={handleClearLogs}
          onRefreshLogs={refreshLogsFromStorage}
        />
      </div>
    </div>
  )
}
