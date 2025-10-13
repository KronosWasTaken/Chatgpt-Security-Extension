import React from "react"

interface StatusToggleProps {
  isEnabled: boolean
  onToggle: (enabled: boolean) => void
}

export default function StatusToggle({ isEnabled, onToggle }: StatusToggleProps) {
  return (
    <div className="bg-slate-800 bg-opacity-50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">Extension Status</h3>
          <p className="text-sm text-slate-400">
            {isEnabled 
              ? "🟢 Security scanning is active and protecting your uploads" 
              : "🔴 Security scanning is disabled - uploads are not being monitored"
            }
          </p>
        </div>
        <button
          onClick={() => {
            console.log('🔄 StatusToggle clicked! Current:', isEnabled, 'New:', !isEnabled)
            onToggle(!isEnabled)
          }}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
            isEnabled ? 'bg-green-600' : 'bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              isEnabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
