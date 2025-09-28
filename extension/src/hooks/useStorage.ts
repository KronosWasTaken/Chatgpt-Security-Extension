import { useState, useEffect } from 'react'
import type { Config, LogEntry } from '~types'

export const useStorage = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(defaultValue)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadValue = async () => {
      try {
        const result = await chrome.storage.sync.get(key)
        if (result[key] !== undefined) {
          setValue(result[key])
        }
      } catch (error) {
        console.error('Failed to load from storage:', error)
      } finally {
        setLoading(false)
      }
    }

    loadValue()

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[key]) {
        setValue(changes[key].newValue)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [key])

  const updateValue = async (newValue: T) => {
    try {
      console.log('useStorage: Saving to storage:', key, newValue)
      await chrome.storage.sync.set({ [key]: newValue })
      setValue(newValue)
      console.log('useStorage: Successfully saved to storage')
    } catch (error) {
      console.error('Failed to save to storage:', error)
    }
  }

  return [value, updateValue, loading] as const
}

export const useConfig = () => {
  const defaultConfig: Config = {
    isEnabled: true,
    apiKey: '',
    geminiApiKey: '', 
    advancedSettings: {
      blockEnvFiles: true,
      realTimeScanning: true,
      debugMode: false,
      scanExecutables: false
    }
  }

  return useStorage('config', defaultConfig)
}

export const useLogs = () => {
  const defaultLogs: LogEntry[] = [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      message: 'File Upload Scanner initialized successfully by Aaditya Raj',
      type: 'info'
    }
  ]

  return useStorage('logs', defaultLogs)
}