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

  static async signInWithGoogle(): Promise<void> {
    if (!supabase) {
      throw new Error("Supabase not configured. Please add your Supabase credentials to .env.local")
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) throw error

    // User will be redirected to Google, then back to your app
    // The actual user data will be available after redirect
  }

  static async handleOAuthCallback(): Promise<User | null> {
    if (!supabase) return null

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) return null

      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!profile) {
        // Create profile for new OAuth user
        const newProfile = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name ||
                session.user.user_metadata?.name ||
                session.user.email?.split('@')[0],
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([newProfile])

        if (profileError) {
          console.error('Failed to create profile:', profileError)
        }
      }

      const user: User = {
        id: session.user.id,
        email: session.user.email!,
        name: profile?.name || session.user.user_metadata?.full_name || session.user.user_metadata?.name,
        gender: profile?.gender,
        experience: profile?.experience,
        goals: profile?.goals,
        createdAt: session.user.created_at,
      }

      this.setUser(user)
      return user
    } catch (error) {
      console.error('OAuth callback error:', error)
      return null
    }
  }

  static async updateProfile(userId: string, updates: Partial<User>): Promise<void> {
    // If Supabase is not configured, just update localStorage
    if (!supabase) {
      const currentUser = this.getUser()
      if (currentUser) {
        this.setUser({ ...currentUser, ...updates })
      }
      return
    }

    // Update profile in Supabase
    const { error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        gender: updates.gender,
        experience: updates.experience,
        goals: updates.goals,
      })
      .eq('id', userId)

    if (error) {
      console.error('Failed to update profile:', error)
      throw new Error('Failed to update profile')
    }

    // Also update localStorage
    const currentUser = this.getUser()
    if (currentUser) {
      this.setUser({ ...currentUser, ...updates })
    }
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
