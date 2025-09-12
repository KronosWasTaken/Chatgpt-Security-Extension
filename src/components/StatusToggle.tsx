import React from "react"

interface StatusToggleProps {
  isEnabled: boolean
  onToggle: (enabled: boolean) => void
}

export default function StatusToggle({ isEnabled, onToggle }: StatusToggleProps) {
  return (
    <div className="bg-slate-800 bg-opacity-50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Status</h2>
          <p className="text-slate-400">
            {isEnabled ? 'Scanner is actively monitoring uploads' : 'Scanner is currently disabled - uploads will not be scanned'}
          </p>
        </div>
        
        <button
          onClick={() => onToggle(!isEnabled)}
          className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors duration-200 ${
            isEnabled ? 'bg-purple-600' : 'bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
              isEnabled ? 'translate-x-14' : 'translate-x-2'
            }`}
          />
        </button>
      </div>
      
      <div className="mt-4 flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          isEnabled ? 'bg-green-400' : 'bg-red-400'
        }`} />
        <span className="text-sm text-slate-300">
          {isEnabled ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  )
}