import React, { useState } from "react"
import type { Config } from "~types"

interface ConfigPanelProps {
  config: Config
  onConfigChange: (config: Config) => void
  onSave: () => void
}

export default function ConfigPanel({ config, onConfigChange, onSave }: ConfigPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const updateConfig = (updates: Partial<Config>) => {
    const newConfig = { ...config, ...updates }
    console.log('ConfigPanel: Updating config', newConfig)
    if (updates.apiKey) {
      console.log('ConfigPanel: API Key updated, length:', updates.apiKey.length)
    }
    onConfigChange(newConfig)
  }

  const updateAdvancedSetting = (key: keyof Config['advancedSettings'], value: boolean) => {
    onConfigChange({
      ...config,
      advancedSettings: {
        ...config.advancedSettings,
        [key]: value
      }
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave()
      setTimeout(() => setIsSaving(false), 1000)
    } catch (error) {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 bg-opacity-50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Configuration</h2>
          <button className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              🛡️ Threat Detection Configuration
            </label>
            <div className="space-y-3">
              <div className="p-4 bg-blue-700 bg-opacity-30 rounded-xl border border-blue-600">
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-3">
                    <span className="text-sm font-medium text-blue-200">VirusTotal API (Primary Malware Scanner) 🛡️</span>
                    <p className="text-xs text-slate-400 mt-1">
                      Always-on cloud malware detection - Primary scanner (requires API key)
                    </p>
                  </div>
                  <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                    PRIMARY
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-slate-700 bg-opacity-50 rounded-xl border border-slate-600">
                <div className="flex-1 mr-3">
                  <span className="text-sm font-medium text-slate-200">Gemini 2.0 Flash (Prompt Injection Protection) 🤖</span>
                  <p className="text-xs text-slate-400 mt-1">
                    Ultra-fast AI detection of prompt injection attacks in real-time (requires API key)
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  config.geminiApiKey ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'
                }`}>
                  {config.geminiApiKey ? 'READY' : 'NEEDS KEY'}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              🤖 Gemini API Key (Prompt Injection Detection)
            </label>
            <input
              type="password"
              value={config.geminiApiKey || ''}
              onChange={(e) => updateConfig({ geminiApiKey: e.target.value })}
              placeholder="Enter your Gemini API key"
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
            />
            <p className="text-xs text-slate-400 mt-2">
              Get your free API key from{' '}
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-green-400 hover:text-green-300 underline"
              >
                Google AI Studio
              </a>
              {' '}for ultra-fast prompt injection detection with Gemini 2.0 Flash
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              🛡️ VirusTotal API Key (File Malware Scanning)
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => updateConfig({ apiKey: e.target.value })}
              placeholder="Enter your VirusTotal API key"
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
            />
            <p className="text-xs text-slate-400 mt-2">
              Get your free API key from{' '}
              <a 
                href="https://www.virustotal.com/gui/my-apikey" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-purple-400 hover:text-purple-300 underline"
              >
                VirusTotal
              </a>
              {' '}(4 requests/minute limit) - Required for primary malware scanning
            </p>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-slate-400 hover:text-white transition-colors"
          >
            <svg
              className={`w-4 h-4 mr-2 transform transition-transform ${
                showAdvanced ? 'rotate-90' : ''
              }`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
            </svg>
            Advanced
          </button>

          {showAdvanced && (
            <div className="space-y-3 pl-6 border-l border-slate-600 ml-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Block .env files</span>
                <button
                  onClick={() => updateAdvancedSetting('blockEnvFiles', !config.advancedSettings.blockEnvFiles)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.advancedSettings.blockEnvFiles ? 'bg-purple-600' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.advancedSettings.blockEnvFiles ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Real-time scanning</span>
                <button
                  onClick={() => updateAdvancedSetting('realTimeScanning', !config.advancedSettings.realTimeScanning)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.advancedSettings.realTimeScanning ? 'bg-purple-600' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.advancedSettings.realTimeScanning ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Debug mode</span>
                <button
                  onClick={() => updateAdvancedSetting('debugMode', !config.advancedSettings.debugMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.advancedSettings.debugMode ? 'bg-purple-600' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.advancedSettings.debugMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1 mr-3">
                  <span className="text-sm text-slate-300">Scan executable files with VirusTotal</span>
                  <p className="text-xs text-slate-400 mt-1">
                    ⚠️ Allows .exe, .msi files to be scanned instead of immediately blocked
                  </p>
                </div>
                <button
                  onClick={() => updateAdvancedSetting('scanExecutables', !config.advancedSettings.scanExecutables)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.advancedSettings.scanExecutables ? 'bg-orange-600' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.advancedSettings.scanExecutables ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        <div className="flex items-center justify-center">
          {isSaving ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
              </svg>
              Save Configuration
            </>
          )}
        </div>
      </button>
    </div>
  )
}