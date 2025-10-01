import { supabase } from './supabase'

export interface User {
  id: string
  email: string
  name?: string
  gender?: "male" | "female" | "Prefer not say"
  experience?: "beginner" | "intermediate" | "advanced"
  goals?: string[]
  createdAt: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
}

export class AuthService {
  private static readonly STORAGE_KEY = "liftlog_user"

  static getUser(): User | null {
    if (typeof window === "undefined") return null

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  static setUser(user: User): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))
  }

  static removeUser(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(this.STORAGE_KEY)
  }

  static async signUp(email: string, password: string): Promise<User> {
    // If Supabase is not configured, use localStorage fallback
    if (!supabase) {
      return this.signUpLocalStorage(email, password)
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error
    if (!data.user) throw new Error("Failed to create user")

    const user: User = {
      id: data.user.id,
      email: data.user.email!,
      createdAt: data.user.created_at,
    }

    // Store user profile in Supabase
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{ id: user.id, email: user.email }])

    if (profileError && profileError.code !== '23505') { // Ignore duplicate key error
      console.error('Failed to create profile:', profileError)
    }

    this.setUser(user)
    return user
  }

  static async signIn(email: string, password: string): Promise<User> {
    // If Supabase is not configured, use localStorage fallback
    if (!supabase) {
      return this.signInLocalStorage(email, password)
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    if (!data.user) throw new Error("Failed to sign in")

    // Get user profile from Supabase
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    const user: User = {
      id: data.user.id,
      email: data.user.email!,
      name: profile?.name,
      gender: profile?.gender,
      experience: profile?.experience,
      goals: profile?.goals,
      createdAt: data.user.created_at,
    }

    this.setUser(user)
    return user
  }

  static async signOut(): Promise<void> {
    if (supabase) {
      await supabase.auth.signOut()
    }
    this.removeUser()
  }

  static async getCurrentSession() {
    if (!supabase) return null
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  // LocalStorage fallback methods
  private static async signUpLocalStorage(email: string, password: string): Promise<User> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Check if user already exists
    const existingUsers = this.getStoredUsers()
    if (existingUsers.some((u) => u.email === email)) {
      throw new Error("User already exists")
    }

    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      createdAt: new Date().toISOString(),
    }

    // Store user in mock database
    existingUsers.push(user)
    localStorage.setItem("liftlog_users", JSON.stringify(existingUsers))

    this.setUser(user)
    return user
  }

  private static async signInLocalStorage(email: string, password: string): Promise<User> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Validate credentials
    const existingUsers = this.getStoredUsers()
    const user = existingUsers.find((u) => u.email === email)

    if (!user) {
      throw new Error("User not found. Please sign up first.")
    }

    // In a real app, you'd validate the password hash here
    // For now, we just check if a password was provided
    if (!password) {
      throw new Error("Password is required")
    }

    this.setUser(user)
    return user
  }

  private static getStoredUsers(): User[] {
    if (typeof window === "undefined") return []

    try {
      const stored = localStorage.getItem("liftlog_users")
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
}
