import { useState, useEffect } from 'react'
import type { AuthUser, LoginCredentials } from '~types'
import { BackendApiService } from '~services/BackendApiService'

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const backendApi = BackendApiService.getInstance()

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        console.log(' AUTH: Loading auth state from storage...')
        const result = await chrome.storage.sync.get(['authUser'])
        console.log(' AUTH: Storage result:', result)
        
        if (result.authUser && result.authUser.token) {
          console.log(' AUTH: Found auth user:', result.authUser.email)
          
          // Verify token with backend
          const isValid = await verifyTokenWithBackend(result.authUser.token)
          if (!isValid) {
            console.log(' AUTH: Token invalid, clearing auth state')
            await chrome.storage.sync.remove(['authUser'])
            setUser(null)
          } else {
            setUser(result.authUser)
          }
        } else {
          console.log(' AUTH: No valid auth user found')
          setUser(null)
        }
      } catch (error) {
        console.error(' AUTH: Failed to load auth state:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadAuthState()

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      console.log(' AUTH: Storage changed:', changes)
      if (changes.authUser) {
        if (changes.authUser.newValue && changes.authUser.newValue.token) {
          console.log(' AUTH: Auth user updated:', changes.authUser.newValue.email)
          setUser(changes.authUser.newValue)
        } else {
          console.log(' AUTH: Auth user removed')
          setUser(null)
        }
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const verifyTokenWithBackend = async (token: string): Promise<boolean> => {
    try {
      const config = backendApi.getConfig()
      if (!config.enabled || !config.apiUrl) {
        console.log(' AUTH: Backend not configured, authentication required')
        return false
      }

      const response = await fetch(`${config.apiUrl}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        console.log(' AUTH: Token verified with backend')
        return true
      } else {
        console.log(' AUTH: Token verification failed:', response.status)
        return false
      }
    } catch (error) {
      console.error(' AUTH: Token verification error:', error)
      return false
    }
  }

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; message: string }> => {
    try {
      console.log(' AUTH: Login attempt with:', credentials.email)
      
      const config = backendApi.getConfig()
      
      // Backend authentication is mandatory
      if (!config.enabled || !config.apiUrl) {
        return { 
          success: false, 
          message: 'Backend server not configured. Please configure the backend URL first.' 
        }
      }

      try {
        console.log(' AUTH: Attempting backend authentication...')
        const response = await fetch(`${config.apiUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password
          })
        })

        if (response.ok) {
          const data = await response.json()
          console.log(' AUTH: Backend login successful:', data)
          
          const authUser: AuthUser = {
            email: data.user_info.email,
            token: data.access_token,
            loginTime: new Date().toISOString(),
            userInfo: data.user_info
          }

          await chrome.storage.sync.set({ authUser })
          console.log(' AUTH: Token saved to Chrome storage:', {
            email: authUser.email,
            tokenLength: authUser.token.length,
            tokenPreview: authUser.token.substring(0, 20) + '...',
            storageKey: 'authUser'
          })
          setUser(authUser)
          
          // Update backend config with user info
          await backendApi.updateConfig({
            userId: data.user_info.user_id,
            clientId: data.user_info.client_id,
            mspId: data.user_info.msp_id
          })
          
          // Broadcast authentication status change to content scripts
          chrome.runtime.sendMessage({
            type: 'AUTH_STATUS_CHANGED',
            isAuthenticated: true
          }).catch(error => {
            console.log(' AUTH: Could not broadcast auth status:', error)
          })
          
          return { success: true, message: 'Login successful!' }
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.log(' AUTH: Backend login failed:', response.status, errorData)
          
          return { 
            success: false, 
            message: errorData.detail || 'Login failed. Please check your credentials.' 
          }
        }
      } catch (error) {
        console.error(' AUTH: Backend login error:', error)
        
        return { 
          success: false, 
          message: 'Unable to connect to authentication server. Please check your backend configuration.' 
        }
      }
    } catch (error) {
      console.error(' AUTH: Login error:', error)
      return { success: false, message: 'Login failed. Please try again.' }
    }
  }

  const logout = async () => {
    try {
      console.log(' AUTH: Logging out user')
      await chrome.storage.sync.remove(['authUser'])
      setUser(null)
      console.log(' AUTH: User logged out successfully')
      
      // Broadcast authentication status change to content scripts
      chrome.runtime.sendMessage({
        type: 'AUTH_STATUS_CHANGED',
        isAuthenticated: false
      }).catch(error => {
        console.log(' AUTH: Could not broadcast auth status:', error)
      })
    } catch (error) {
      console.error(' AUTH: Logout error:', error)
    }
  }

  const isAuthenticated = () => {
    const authenticated = user !== null && user.token !== undefined
    console.log(' AUTH: isAuthenticated check:', { user: user?.email, hasToken: !!user?.token, authenticated })
    return authenticated
  }

  const clearAuth = async () => {
    try {
      console.log(' AUTH: Manually clearing auth state')
      await chrome.storage.sync.remove(['authUser'])
      setUser(null)
      console.log(' AUTH: Auth state cleared')
    } catch (error) {
      console.error(' AUTH: Clear auth error:', error)
    }
  }

  return {
    user,
    loading,
    login,
    logout,
    clearAuth,
    isAuthenticated
  }
}
