import React, { useState, useEffect } from 'react'
import { BackendApiService } from '../services/BackendApiService'

interface BackendConfigProps {
  onConfigChange?: (config: any) => void
}

export const BackendConfigPanel: React.FC<BackendConfigProps> = ({ onConfigChange }) => {
  const [config, setConfig] = useState({
    enabled: false,
    apiUrl: 'http://localhost:8000',
    apiKey: ''
  })
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown')
  const [testing, setTesting] = useState(false)

  const backendApi = BackendApiService.getInstance()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const result = await chrome.storage.sync.get(['backendConfig'])
      if (result.backendConfig) {
        setConfig(result.backendConfig)
      }
    } catch (error) {
      console.error('Failed to load backend config:', error)
    }
  }

  const handleToggle = async (enabled: boolean) => {
    const newConfig = { ...config, enabled }
    setConfig(newConfig)
    await saveConfig(newConfig)
  }

  const handleApiUrlChange = (apiUrl: string) => {
    const newConfig = { ...config, apiUrl }
    setConfig(newConfig)
  }

  const handleApiKeyChange = (apiKey: string) => {
    const newConfig = { ...config, apiKey }
    setConfig(newConfig)
  }

  const saveConfig = async (newConfig = config) => {
    try {
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
        return '✅'
      case 'disconnected':
        return '❌'
      default:
        return '❓'
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
    <div className="bg-slate-800 bg-opacity-50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Backend Integration</h3>
        <button
          onClick={() => handleToggle(!config.enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.enabled ? 'bg-green-600' : 'bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Backend API URL
          </label>
          <input
            type="text"
            value={config.apiUrl}
            onChange={(e) => handleApiUrlChange(e.target.value)}
            placeholder="http://localhost:8000"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!config.enabled}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            API Key (Optional - for authentication)
          </label>
          <input
            type="password"
            value={config.apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="Enter JWT token if required"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!config.enabled}
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
              disabled={!config.enabled || testing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            
            <button
              onClick={() => saveConfig()}
              disabled={!config.enabled}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
        </div>

        {config.enabled && (
          <div className="bg-blue-700 bg-opacity-30 rounded-xl border border-blue-600 p-4">
            <h4 className="text-sm font-medium text-blue-200 mb-2">Integration Benefits</h4>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• Advanced PHI/PII detection using backend AI models</li>
              <li>• Centralized compliance logging and audit trails</li>
              <li>• Multi-tenant policy enforcement</li>
              <li>• Real-time compliance dashboards</li>
              <li>• Enterprise-grade security monitoring</li>
            </ul>
          </div>
        )}

        {!config.enabled && (
          <div className="bg-yellow-700 bg-opacity-30 rounded-xl border border-yellow-600 p-4">
            <p className="text-sm text-yellow-200">
              Backend integration is disabled. The extension will use local VirusTotal and Gemini APIs only.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}