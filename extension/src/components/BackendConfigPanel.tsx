import React, { useState, useEffect } from 'react'
import { BackendApiService } from '../services/BackendApiService'

interface BackendConfigProps {
  onConfigChange?: (config: any) => void
  isExtensionEnabled?: boolean
}

export const BackendConfigPanel: React.FC<BackendConfigProps> = ({ onConfigChange, isExtensionEnabled = true }) => {
  const [config, setConfig] = useState({
    enabled: isExtensionEnabled, // Follow extension status
    apiUrl: 'http://localhost:8000',
    apiKey: '',
    clientId: 'acme-health',
    mspId: 'msp-001'
  })
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown')
  const [testing, setTesting] = useState(false)

  const backendApi = BackendApiService.getInstance()

  useEffect(() => {
    loadConfig()
  }, [])

  useEffect(() => {
    // Backend automatically follows extension status
    const newConfig = { ...config, enabled: isExtensionEnabled }
    setConfig(newConfig)
    saveConfig(newConfig)
  }, [isExtensionEnabled])

  useEffect(() => {
    // Load auth token when user logs in
    const loadAuthToken = async () => {
      try {
        const result = await chrome.storage.sync.get(['authUser'])
        if (result.authUser && result.authUser.token) {
          const newConfig = { ...config, apiKey: result.authUser.token }
          setConfig(newConfig)
        }
      } catch (error) {
        console.error('Failed to load auth token:', error)
      }
    }
    
    loadAuthToken()
    
    // Listen for auth changes
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.authUser && changes.authUser.newValue) {
        const authUser = changes.authUser.newValue
        if (authUser.token) {
          const newConfig = { ...config, apiKey: authUser.token }
          setConfig(newConfig)
        }
      }
    }
    
    chrome.storage.onChanged.addListener(handleStorageChange)
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const loadConfig = async () => {
    try {
      const result = await chrome.storage.sync.get(['config'])
      if (result.config?.backendConfig) {
        const backendConfig = result.config.backendConfig
        setConfig({
          enabled: isExtensionEnabled, // Always follow extension status
          apiUrl: backendConfig.apiUrl || 'http://localhost:8000',
          apiKey: backendConfig.apiKey || '',
          clientId: backendConfig.clientId || 'acme-health',
          mspId: backendConfig.mspId || 'msp-001'
        })
      }
    } catch (error) {
      console.error('Failed to load backend config:', error)
    }
  }

  const handleApiUrlChange = (apiUrl: string) => {
    const newConfig = { ...config, apiUrl }
    setConfig(newConfig)
  }

  const handleApiKeyChange = (apiKey: string) => {
    const newConfig = { ...config, apiKey }
    setConfig(newConfig)
  }

  const handleClientIdChange = (clientId: string) => {
    const newConfig = { ...config, clientId }
    setConfig(newConfig)
  }

  const handleMspIdChange = (mspId: string) => {
    const newConfig = { ...config, mspId }
    setConfig(newConfig)
  }

  const saveConfig = async (newConfig = config) => {
    try {
      // Save to the main config's backendConfig
      const result = await chrome.storage.sync.get(['config'])
      const mainConfig = result.config || {}
      
      const updatedConfig = {
        ...mainConfig,
        backendConfig: {
          enabled: newConfig.enabled,
          apiUrl: newConfig.apiUrl,
          apiKey: newConfig.apiKey,
          clientId: newConfig.clientId,
          mspId: newConfig.mspId
        }
      }
      
      await chrome.storage.sync.set({ config: updatedConfig })
      await backendApi.updateConfig(newConfig)
      onConfigChange?.(newConfig)
      console.log('Backend configuration saved:', newConfig)
    } catch (error) {
      console.error('Failed to save backend config:', error)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setConnectionStatus('unknown')
    
    try {
      // Update config first
      await backendApi.updateConfig(config)
      
      // Test connection
      const isConnected = await backendApi.testConnection()
      setConnectionStatus(isConnected ? 'connected' : 'disconnected')
    } catch (error) {
      console.error('Connection test failed:', error)
      setConnectionStatus('disconnected')
    } finally {
      setTesting(false)
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return ''
      case 'disconnected':
        return ''
      default:
        return ''
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected to backend'
      case 'disconnected':
        return 'Backend not available'
      default:
        return 'Connection not tested'
    }
  }

  return (
    <div >
      {/* <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Backend Integration</h3>
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${isExtensionEnabled ? 'text-green-400' : 'text-red-400'}`}>
            {isExtensionEnabled ? ' Active' : ' Inactive'}
          </span>
          <span className="text-xs text-slate-400">
            (Follows Extension Status)
          </span>
        </div>
      </div> */}
{/* 
      <div className="space-y-4">
        <div>
          <label className="block mb-2 text-sm font-medium text-slate-300">
            Backend API URL
          </label>
          <input
            type="text"
            value={config.apiUrl}
            onChange={(e) => handleApiUrlChange(e.target.value)}
            placeholder="http://localhost:8000"
            className="w-full px-3 py-2 text-white border rounded-lg bg-slate-700 border-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isExtensionEnabled}
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-slate-300">
            API Key (Auto-filled from login)
          </label>
          <input
            type="password"
            value={config.apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="JWT token from authentication"
            className="w-full px-3 py-2 text-white border rounded-lg bg-slate-700 border-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isExtensionEnabled}
          />
          <p className="mt-1 text-xs text-slate-400">
            This is automatically filled when you log in with backend credentials
          </p>
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-slate-300">
            Client ID
          </label>
          <input
            type="text"
            value={config.clientId}
            onChange={(e) => handleClientIdChange(e.target.value)}
            placeholder="acme-health"
            className="w-full px-3 py-2 text-white border rounded-lg bg-slate-700 border-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isExtensionEnabled}
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-slate-300">
            MSP ID
          </label>
          <input
            type="text"
            value={config.mspId}
            onChange={(e) => handleMspIdChange(e.target.value)}
            placeholder="msp-001"
            className="w-full px-3 py-2 text-white border rounded-lg bg-slate-700 border-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isExtensionEnabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-300">{getStatusIcon()}</span>
            <span className="text-sm text-slate-300">{getStatusText()}</span>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={testConnection}
              disabled={!isExtensionEnabled || testing}
              className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            
            <button
              onClick={() => saveConfig()}
              disabled={!isExtensionEnabled}
              className="px-4 py-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>

        {isExtensionEnabled && (
          <div className="p-4 bg-blue-700 border border-blue-600 bg-opacity-30 rounded-xl">
            <h4 className="mb-2 text-sm font-medium text-blue-200">Integration Benefits</h4>
            <ul className="space-y-1 text-xs text-slate-300">
              <li>• Advanced PHI/PII detection using backend AI models</li>
              <li>• Centralized compliance logging and audit trails</li>
              <li>• Multi-tenant policy enforcement</li>
              <li>• Real-time compliance dashboards</li>
              <li>• Enterprise-grade security monitoring</li>
            </ul>
          </div>
        )}

        {!isExtensionEnabled && (
          <div className="p-4 bg-yellow-700 border border-yellow-600 bg-opacity-30 rounded-xl">
            <p className="text-sm text-yellow-200">
              Backend integration is disabled because the extension is inactive. Enable the extension to activate backend integration.
            </p>
          </div>
        )}
      </div> */}
    </div>
  )
}