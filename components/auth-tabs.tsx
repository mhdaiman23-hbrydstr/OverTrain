"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type AuthTabsProps = {
  formData: { email: string; password: string; confirmPassword: string }
  isLoading: boolean
  onInputChange: (field: string, value: string) => void
  onAuth: (type: "login" | "signup") => void | Promise<void>
  onGoogle: () => void | Promise<void>
  onApple?: () => void | Promise<void>
  onForgotPassword: () => void
  idPrefix?: string
}

export function AuthTabs({
  formData,
  isLoading,
  onInputChange,
  onAuth,
  onGoogle,
  onApple,
  onForgotPassword,
  idPrefix = "auth",
}: AuthTabsProps) {
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if running on iOS native app
    const checkPlatform = () => {
      const isIOSDevice = typeof window !== 'undefined' && 
        (window as any).Capacitor?.getPlatform?.() === 'ios'
      setIsIOS(isIOSDevice)
    }
    checkPlatform()
  }, [])

  const ids = {
    loginEmail: `${idPrefix}-login-email`,
    loginPassword: `${idPrefix}-login-password`,
    signupEmail: `${idPrefix}-signup-email`,
    signupPassword: `${idPrefix}-signup-password`,
    signupConfirm: `${idPrefix}-signup-confirm`,
  }
  return (
    <Tabs defaultValue="login" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>

      <TabsContent value="login" className="space-y-4">
        <div className="text-center mb-6">
          <p className="text-lg text-muted-foreground">Welcome back! Ready to break your limits?</p>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={onGoogle}
          disabled={isLoading}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        {/* Apple Sign-In - Only visible on iOS devices (Apple policy requirement) */}
        {isIOS && onApple && (
          <Button
            variant="outline"
            className="w-full bg-black text-white hover:bg-gray-900 hover:text-white border-black"
            onClick={onApple}
            disabled={isLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </Button>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onAuth("login") }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={ids.loginEmail}>Email</Label>
            <Input
              id={ids.loginEmail}
              type="email"
              placeholder="Enter your email"
              className="bg-input border-border"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => onInputChange("email", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={ids.loginPassword}>Password</Label>
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <Input
              id={ids.loginPassword}
              type="password"
              placeholder="Enter your password"
              className="bg-input border-border"
              autoComplete="current-password"
              value={formData.password}
              onChange={(e) => onInputChange("password", e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full gradient-primary text-primary-foreground"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Signing In...
              </span>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="signup" className="space-y-4">
        <div className="text-center mb-6">
          <p className="text-lg text-muted-foreground">New to OverTrain? Let's get you started!</p>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={onGoogle}
          disabled={isLoading}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        {/* Apple Sign-In - Only visible on iOS devices (Apple policy requirement) */}
        {isIOS && onApple && (
          <Button
            variant="outline"
            className="w-full bg-black text-white hover:bg-gray-900 hover:text-white border-black"
            onClick={onApple}
            disabled={isLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </Button>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onAuth("signup") }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={ids.signupEmail}>Email</Label>
            <Input
              id={ids.signupEmail}
              type="email"
              placeholder="Enter your email"
              className="bg-input border-border"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => onInputChange("email", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={ids.signupPassword}>Password</Label>
            <Input
              id={ids.signupPassword}
              type="password"
              placeholder="Create a password"
              className="bg-input border-border"
              autoComplete="new-password"
              value={formData.password}
              onChange={(e) => onInputChange("password", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={ids.signupConfirm}>Confirm Password</Label>
            <Input
              id={ids.signupConfirm}
              type="password"
              placeholder="Confirm your password"
              className="bg-input border-border"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={(e) => onInputChange("confirmPassword", e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full gradient-primary text-primary-foreground"
            disabled={isLoading}
          >
            {isLoading ? "Starting Your Journey..." : "Start Your Journey"}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  )
}
