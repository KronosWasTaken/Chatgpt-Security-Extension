import { useState, useEffect } from "react"
import Header from "~components/Header"
import StatusToggle from "~components/StatusToggle"
import ConfigPanel from "~components/ConfigPanel"
import { BackendConfigPanel } from "~components/BackendConfigPanel"
import LogsPanel from "~components/LogsPanel"
import LoginPage from "~components/LoginPage"
import { useConfig, useLogs } from "~hooks/useStorage"
import { useAuth } from "~hooks/useAuth"
import type { LogEntry } from "~types"
import "~style.css"

export default function OptionsPage() {
  console.log('OptionsPage component rendering')
  
  const { user, loading: authLoading, login, logout, isAuthenticated } = useAuth()
  const [config, updateConfig, configLoading] = useConfig()
  const [logs, updateLogs, logsLoading] = useLogs()
  
  console.log('🔐 OPTIONS: Loading states:', { authLoading, configLoading, logsLoading })
  console.log('🔐 OPTIONS: Auth user:', user)
  console.log('🔐 OPTIONS: Is authenticated:', isAuthenticated())
  console.log('🔐 OPTIONS: Config:', config)
  console.log('🔐 OPTIONS: Logs:', logs)

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
    console.log('🔐 OPTIONS: Showing auth loading state...')
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900">
        <div className="flex items-center text-xl text-white">
          <svg className="w-8 h-8 mr-3 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
  console.log('🔐 OPTIONS: Authentication check result:', authenticated)
  
  if (!authenticated) {
    console.log('🔐 OPTIONS: User not authenticated, showing login page')
    return <LoginPage onLogin={login} loading={authLoading} />
  }

  // Show loading state for config/logs if authenticated
  if (configLoading || logsLoading) {
    console.log('🔐 OPTIONS: Showing loading state...')
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900">
        <div className="flex items-center text-xl text-white">
          <svg className="w-8 h-8 mr-3 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
    console.log('🔄 OptionsPage: handleToggle called with enabled:', enabled)
    const newConfig = { ...config, isEnabled: enabled }
    console.log('🔄 OptionsPage: Updating config to:', newConfig)
    updateConfig(newConfig)
    
    chrome.runtime.sendMessage({
      type: 'SAVE_CONFIG',
      config: newConfig
    }, (response) => {
      console.log('🔄 SAVE_CONFIG response:', response)
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

  const handleTestLog = async () => {
    console.log('🧪 Testing manual log entry...')
    chrome.runtime.sendMessage({
      type: 'ADD_LOG',
      message: '🧪 TEST LOG - Manual test from options page',
      logType: 'info',
      category: 'test'
    }, (response) => {
      console.log('🧪 Test log response:', response)
    })
  }

  const handleTestFileScan = async () => {
    console.log('🧪 Testing file scan...')
    
    // Create a simple test file
    const testContent = 'This is a test file for scanning'
    const testFile = new File([testContent], 'test.txt', { type: 'text/plain' })
    
    // Convert file to ArrayBuffer
    const arrayBuffer = await testFile.arrayBuffer()
    const fileData = Array.from(new Uint8Array(arrayBuffer))
    
    chrome.runtime.sendMessage({
      type: 'SCAN_FILE',
      fileName: testFile.name,
      fileData: fileData
    }, (response) => {
      console.log('🧪 File scan response:', response)
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
    <div className="min-h-screen text-white bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900">
      <Header onLogout={logout} userEmail={user?.email} />
      
      <div className="flex flex-col gap-8 px-8 pb-8">
        <div className="space-y-6">
          <StatusToggle 
            isEnabled={config.isEnabled} 
            onToggle={handleToggle}
          />
          
               {/* Test Buttons - Commented Out */}
               {/* <div className="p-4 bg-yellow-600 border border-yellow-500 bg-opacity-30 rounded-xl">
                 <h4 className="mb-2 text-sm font-medium text-yellow-200">API Tests</h4>
                 <div className="flex space-x-2">
                   <button
                     onClick={handleTestLog}
                     className="px-4 py-2 font-medium text-black transition-colors bg-yellow-500 rounded-lg hover:bg-yellow-400"
                   >
                     🧪 Test API Call
                   </button>
                   <button
                     onClick={handleTestFileScan}
                     className="px-4 py-2 font-medium text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-400"
                   >
                     🔍 Test File Scan
                   </button>
                 </div>
                 <p className="mt-2 text-xs text-yellow-300">
                   Test API logging and file scanning functionality
                 </p>
               </div> */}
          
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
        <div className="p-4 border bg-slate-800 bg-opacity-30 backdrop-blur-sm rounded-xl border-slate-700">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <div className="flex items-center space-x-4">
              <span>© 2025 File Upload Scanner by Aaditya Raj</span>
              <span>•</span>
              <a href="#" className="transition-colors hover:text-white">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="transition-colors hover:text-white">Terms of Service</a>
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