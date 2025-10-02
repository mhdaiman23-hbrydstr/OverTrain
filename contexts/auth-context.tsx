"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { type User, type AuthState, AuthService } from "@/lib/auth"

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => void
  updateUser: (updates: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
  })

  useEffect(() => {
    // Check for OAuth callback first
    const checkOAuthCallback = async () => {
      const oauthUser = await AuthService.handleOAuthCallback()
      if (oauthUser) {
        setState({ user: oauthUser, isLoading: false })
        // Load user data from database
        if (oauthUser.id) {
          await AuthService.loadUserData(oauthUser.id)
        }
      } else {
        const localUser = AuthService.getUser()
        setState({ user: localUser, isLoading: false })
        // Load user data from database if user exists
        if (localUser && localUser.id) {
          await AuthService.loadUserData(localUser.id)
        }
      }
    }

    checkOAuthCallback()
  }, [])

  const signIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const user = await AuthService.signIn(email, password)
      setState({ user, isLoading: false })

      // Load user data from database
      if (user && user.id) {
        await AuthService.loadUserData(user.id)
      }
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const user = await AuthService.signUp(email, password)
      setState({ user, isLoading: false })
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const signInWithGoogle = async () => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      await AuthService.signInWithGoogle()
      // User will be redirected to Google, then back
      // The OAuth callback will handle setting the user state
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const signOut = () => {
    AuthService.signOut()
    setState({ user: null, isLoading: false })
  }

  const updateUser = async (updates: Partial<User>) => {
    if (!state.user) return

    try {
      await AuthService.updateProfile(state.user.id, updates)
      const updatedUser = { ...state.user, ...updates }
      setState((prev) => ({ ...prev, user: updatedUser }))
    } catch (error) {
      console.error('Failed to update user:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
