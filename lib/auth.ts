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

  static async signIn(email: string, password: string): Promise<User> {
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

  static signOut(): void {
    this.removeUser()
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
