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
    await supabase.auth.signOut()
    this.removeUser()
  }

  static async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }
}
