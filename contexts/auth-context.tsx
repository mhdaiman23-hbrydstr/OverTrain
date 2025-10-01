"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { type User, type AuthState, AuthService } from "@/lib/auth"

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => void
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
  })

  useEffect(() => {
    const user = AuthService.getUser()
    setState({ user, isLoading: false })
  }, [])

  const signIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const user = await AuthService.signIn(email, password)
      setState({ user, isLoading: false })
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

  const signOut = () => {
    AuthService.signOut()
    setState({ user: null, isLoading: false })
  }

  const updateUser = (updates: Partial<User>) => {
    if (!state.user) return

    const updatedUser = { ...state.user, ...updates }
    AuthService.setUser(updatedUser)
    setState((prev) => ({ ...prev, user: updatedUser }))
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
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
