"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dumbbell, TrendingUp, Zap, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { IntakeForm } from "@/components/intake-form"
import { ProgramsSection } from "@/components/programs-section"
import { WorkoutLoggerComponent } from "@/components/workout-logger"
import { SidebarNavigation } from "@/components/sidebar-navigation"
import { BottomNavigation } from "@/components/bottom-navigation"
import { AnalyticsSection } from "@/components/analytics-section"
import { ProfileSection } from "@/components/profile-section"
import { ProgramStateManager } from "@/lib/program-state"

export default function HomePage() {
  const { user, signIn, signUp, signInWithGoogle, signOut, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [programKey, setProgramKey] = useState(0)

  const [currentView, setCurrentView] = useState<
    "dashboard" | "programs" | "workout" | "analytics" | "train" | "profile"
  >("train")

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  })

  useEffect(() => {
    if (user && user.gender) {
      // Check if user has an active program
      const activeProgram = ProgramStateManager.getActiveProgram()

      if (activeProgram) {
        // Go directly to workout if program exists
        setCurrentView("workout")
      } else {
        // Go to train screen to select a program
        setCurrentView("train")
      }
    }
  }, [user])

  // Listen for program state changes (e.g., after loading from database)
  useEffect(() => {
    const handleProgramChange = () => {
      if (user && user.gender) {
        const activeProgram = ProgramStateManager.getActiveProgram()
        if (activeProgram && currentView === "train") {
          setCurrentView("workout")
        }
      }
    }

    window.addEventListener("programChanged", handleProgramChange)
    return () => window.removeEventListener("programChanged", handleProgramChange)
  }, [user, currentView])

  const handleAuth = async (type: "login" | "signup") => {
    setIsLoading(true)
    setError("")

    try {
      // Validate inputs
      if (!formData.email || !formData.password) {
        throw new Error("Email and password are required")
      }

      if (type === "signup") {
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match")
        }
        await signUp(formData.email, formData.password)
      } else {
        await signIn(formData.email, formData.password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError("")

    try {
      await signInWithGoogle()
      // User will be redirected to Google
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleStartWorkout = () => {
    setCurrentView("workout")
  }

  const handleViewChange = (view: string) => {
    // Redirect train view to workout if program exists, otherwise show train screen
    if (view === "train") {
      const activeProgram = ProgramStateManager.getActiveProgram()
      setCurrentView(activeProgram ? "workout" : "train")
    } else {
      setCurrentView(view as any)
    }
  }

  const handleProgramStarted = () => {
    setProgramKey((prev) => prev + 1)
    setCurrentView("workout")
  }

  const handleWorkoutComplete = () => {
    // Program state is already updated in workout-logger component
    // Just refresh the key to allow showing summary dialog
    console.log("[v0] handleWorkoutComplete called - workout completed")
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-2xl font-bold text-gradient">LiftLog</div>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  if (user && !user.gender) {
    return <IntakeForm />
  }

  if (user && currentView === "profile") {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <SidebarNavigation currentView="profile" onViewChange={setCurrentView} />

        <div className="flex-1 lg:ml-64 overflow-y-auto overflow-x-hidden h-screen">
          <ProfileSection />
        </div>
        <BottomNavigation currentView={currentView} onViewChange={handleViewChange} />
      </div>
    )
  }

  if (user && currentView === "programs") {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <SidebarNavigation currentView="programs" onViewChange={setCurrentView} />

        <div className="flex-1 lg:ml-64 overflow-y-auto overflow-x-hidden h-screen">
          <ProgramsSection
            onAddProgram={() => setCurrentView("programs")}
            onProgramStarted={handleProgramStarted}
            onNavigateToTrain={() => handleViewChange("train")}
          />
        </div>
        <BottomNavigation currentView={currentView} onViewChange={handleViewChange} />
      </div>
    )
  }

  if (user && currentView === "workout") {
    const currentWorkout = ProgramStateManager.getCurrentWorkout()

    // If no workout available, redirect to train screen
    if (!currentWorkout) {
      setCurrentView("train")
      return null
    }

    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <SidebarNavigation currentView="workout" onViewChange={setCurrentView} />

        <div className="flex-1 lg:ml-64 overflow-y-auto overflow-x-hidden h-screen">
          <WorkoutLoggerComponent
            key={programKey}
            initialWorkout={currentWorkout}
            onComplete={handleWorkoutComplete}
            onCancel={() => setCurrentView("train")}
            onViewAnalytics={() => setCurrentView("analytics")}
          />
        </div>
        <BottomNavigation currentView={currentView} onViewChange={handleViewChange} />
      </div>
    )
  }

  if (user && currentView === "analytics") {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <SidebarNavigation currentView="analytics" onViewChange={setCurrentView} />

        <div className="flex-1 lg:ml-64 overflow-y-auto overflow-x-hidden h-screen">
          <AnalyticsSection />
        </div>
        <BottomNavigation currentView={currentView} onViewChange={handleViewChange} />
      </div>
    )
  }

  if (user && currentView === "train") {
    return (
      <div className="flex h-screen bg-background overflow-x-hidden">
        <SidebarNavigation currentView="train" onViewChange={setCurrentView} />

        <div className="flex-1 lg:ml-64 overflow-x-hidden">
          <div className="min-h-screen bg-background">
            <header className="border-b border-border/50">
              <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gradient">LiftLog</h1>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Welcome, {user.name || user.email}</span>
                  <Button variant="outline" size="sm" onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </header>

            <main className="container mx-auto px-4 py-8 pb-20">
              <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="text-center space-y-4 max-w-md">
                  <Dumbbell className="h-16 w-16 text-primary mx-auto" />
                  <h2 className="text-3xl font-bold">Ready to Start Training?</h2>
                  <p className="text-muted-foreground">
                    Choose a workout program tailored to your goals and start your fitness journey today.
                  </p>
                  <Button
                    className="w-full gradient-primary text-primary-foreground mt-6"
                    onClick={() => setCurrentView("programs")}
                    size="lg"
                  >
                    Browse Programs
                  </Button>
                </div>
              </div>
            </main>
          </div>
        </div>
        <BottomNavigation currentView={currentView} onViewChange={handleViewChange} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-10" />
        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-6xl font-bold text-gradient text-balance">LiftLog</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
                Your personal fitness companion. Track workouts, build custom programs, and achieve your goals with
                intelligent progress analytics.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <Card className="gradient-card border-border/50">
                <CardHeader className="text-center">
                  <Dumbbell className="h-12 w-12 text-primary mx-auto mb-2" />
                  <CardTitle>Smart Workouts</CardTitle>
                  <CardDescription>
                    Gender-specific programs tailored to your goals and experience level
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="gradient-card border-border/50">
                <CardHeader className="text-center">
                  <TrendingUp className="h-12 w-12 text-accent mx-auto mb-2" />
                  <CardTitle>Progress Tracking</CardTitle>
                  <CardDescription>Real-time analytics and progression tracking with visual charts</CardDescription>
                </CardHeader>
              </Card>

              <Card className="gradient-card border-border/50">
                <CardHeader className="text-center">
                  <Zap className="h-12 w-12 text-primary mx-auto mb-2" />
                  <CardTitle>Mobile Ready</CardTitle>
                  <CardDescription>Optimized for mobile with offline support and PWA capabilities</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card className="gradient-card border-border/50">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Get Started</CardTitle>
              <CardDescription>Create your account or sign in to continue</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
              )}

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
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

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      className="bg-input border-border"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      className="bg-input border-border"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full gradient-primary text-primary-foreground"
                    onClick={() => handleAuth("login")}
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
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

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      className="bg-input border-border"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      className="bg-input border-border"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="Confirm your password"
                      className="bg-input border-border"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full gradient-primary text-primary-foreground"
                    onClick={() => handleAuth("signup")}
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="border-t border-border/50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="text-muted-foreground">Workouts Logged</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-accent">500+</div>
              <div className="text-muted-foreground">Active Users</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">95%</div>
              <div className="text-muted-foreground">Goal Achievement</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
