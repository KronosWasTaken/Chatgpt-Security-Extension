import { useState, useEffect } from "react"
import Header from "~components/Header"
import StatusToggle from "~components/StatusToggle"
import ConfigPanel from "~components/ConfigPanel"
import { BackendConfigPanel } from "~components/BackendConfigPanel"
import LogsPanel from "~components/LogsPanel"
import { useConfig, useLogs } from "~hooks/useStorage"
import type { LogEntry } from "~types"
import "~style.css"

export default function OptionsPage() {
  console.log('OptionsPage component rendering')
  
  const [config, updateConfig, configLoading] = useConfig()
  const [logs, updateLogs, logsLoading] = useLogs()
  
  console.log('Loading states:', { configLoading, logsLoading })
  console.log('Config:', config)
  console.log('Logs:', logs)

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
      <Header />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-8 pb-8">
        <div className="space-y-6">
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
            onConfigChange={(backendConfig) => {
              console.log('Backend config updated:', backendConfig)
            }}
          />
        </div>

        <div className="h-full">
          <LogsPanel 
            logs={logs}
            onClearLogs={handleClearLogs}
            onRefreshLogs={refreshLogsFromStorage}
          />
        </div>
      </div>

      <footer className="px-8 pb-6">
        <div className="bg-slate-800 bg-opacity-30 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <div className="flex items-center space-x-4">
              <span>© 2025 File Upload Scanner by Aaditya Raj</span>
              <span>•</span>
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                config.isEnabled ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <span>Extension {config.isEnabled ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}