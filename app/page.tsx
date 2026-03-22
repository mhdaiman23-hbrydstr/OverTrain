"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
  import { Dumbbell, TrendingUp, Zap, LogOut, Trophy, Target, Flame, ArrowRight, Play, Users, BarChart3, Award, Moon, Sun } from "lucide-react"
  import { useAuth } from "@/contexts/auth-context"
  import { IntakeForm } from "@/components/intake-form"
  import { ProgramsSection } from "@/components/programs-section"
  import { WorkoutLoggerComponent } from "@/components/workout-logger"
  import { TrainSection } from "@/components/train-section"
  import { SidebarNavigation } from "@/components/sidebar-navigation"
  import { BottomNavigation } from "@/components/bottom-navigation"
  import { MobileAnalyticsTab } from "@/components/mobile-analytics-tab"
  import { ProfileSection } from "@/components/profile-section"
  import { ProgramStateManager } from "@/lib/program-state"
  import { debugLogCapture } from "@/lib/debug-logs"
  import { ThemeToggle } from "@/components/theme-toggle"
  import { AuthTabs } from "@/components/auth-tabs"
  import { ForgotPasswordModal } from "@/components/forgot-password-modal"

// Start log capture automatically in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  debugLogCapture.start()
}

export default function HomePage() {
  const { user, signIn, signUp, signInWithGoogle, signInWithApple, signOut, isLoading: authLoading, requestPasswordReset } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [programKey, setProgramKey] = useState(0)
  const [hasActiveProgram, setHasActiveProgram] = useState(false)
  const [dataLoadingStatus, setDataLoadingStatus] = useState<string>("")
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState("")
  const [isResetSubmitting, setIsResetSubmitting] = useState(false)

  const [currentView, setCurrentView] = useState<
    "dashboard" | "programs" | "workout" | "analytics" | "train" | "profile" | null
  >(null)
  const overrideViewRef = useRef(false)

  // FIX: Use refs to prevent stale closures in programChanged listener
  // This prevents being pulled back to Train when saving profile
  const currentViewRef = useRef(currentView)
  const userRef = useRef(user)

  useEffect(() => {
    currentViewRef.current = currentView
  }, [currentView])

  useEffect(() => {
    userRef.current = user
  }, [user])

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const viewParam = params.get("view")
    const allowedViews = new Set(["dashboard", "programs", "workout", "analytics", "train", "profile"])

    if (viewParam && allowedViews.has(viewParam)) {
      setCurrentView(viewParam as "dashboard" | "programs" | "workout" | "analytics" | "train" | "profile")
      overrideViewRef.current = true

      params.delete("view")
      const queryString = params.toString()
      const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}`
      if (nextUrl !== `${window.location.pathname}${window.location.search}`) {
        window.history.replaceState(null, "", nextUrl)
      }
    }
  }, [])

  useEffect(() => {
    if (user && user.gender) {
      if (overrideViewRef.current) return
      // Immediately check for active program without delay
      const initializeView = async () => {
        const activeProgram = await ProgramStateManager.getActiveProgram()
        setHasActiveProgram(!!activeProgram)

        if (activeProgram) {
          // User has program - go to workout view
          setCurrentView("workout")
        } else {
          // No program - show train section with CTA
          setCurrentView("train")
        }
      }

      initializeView()
    }
  }, [user])

  // Listen for program ended event to navigate back to program selection
  useEffect(() => {
    const handleProgramEnded = () => {
      console.log("[HomePage] Program ended, navigating to program selection")
      setHasActiveProgram(false)
      setCurrentView("train")
      setProgramKey(prev => prev + 1) // Force re-render of programs section
    }

    window.addEventListener("programEnded", handleProgramEnded)
    return () => window.removeEventListener("programEnded", handleProgramEnded)
  }, [])

  // Listen for data loading status updates
  useEffect(() => {
    const handleDataLoadingStatus = (event: any) => {
      if (event.detail && event.detail.status !== undefined) {
        const status = event.detail.status
        console.log('[HomePage] Data loading status:', status)
        setDataLoadingStatus(status)

        // If status is empty or "Ready!", clear it after a short delay
        if (!status || status === 'Ready!') {
          setTimeout(() => {
            setDataLoadingStatus('')
            console.log('[HomePage] Loading completed, clearing status')
          }, 500)
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('dataLoadingStatus', handleDataLoadingStatus)
      return () => window.removeEventListener('dataLoadingStatus', handleDataLoadingStatus)
    }
  }, [])

  // Listen for program state changes (e.g., after loading from database)
  // FIX: Use refs to prevent stale closures, empty dependency array to register listener once
  useEffect(() => {
    const handleProgramChange = async () => {
      // Check current values from refs, not closed-over props
      if (userRef.current && userRef.current.gender) {
        // PERF FIX: Skip database load — programChanged fires right after localStorage save,
        // so local data is fresh. Hitting Supabase here risks overwriting with stale data.
        const activeProgram = await ProgramStateManager.getActiveProgram({ skipDatabaseLoad: true })
        setHasActiveProgram(!!activeProgram)
        // Only redirect to workout if:
        // 1. There is an active program AND
        // 2. We're currently in train view (not profile, programs, etc.)
        // This prevents redirecting when saving profile or editing other tabs
        if (activeProgram && currentViewRef.current === "train") {
          console.log("[HomePage] Redirecting from train to workout due to active program")
          setCurrentView("workout")
        } else if (!activeProgram && currentViewRef.current === "workout") {
          // If program ended, redirect back to train
          console.log("[HomePage] Program ended, redirecting to train")
          setCurrentView("train")
        }
      }
    }

    window.addEventListener("programChanged", handleProgramChange)
    return () => window.removeEventListener("programChanged", handleProgramChange)
  }, [])  // FIX: Empty dependencies! Register listener once, use refs for current values

  // Android hardware back button handling
  useEffect(() => {
    let backButtonCleanup: (() => void) | null = null
    let lastBackPress = 0

    const setupBackButton = async () => {
      try {
        const { App } = await import('@capacitor/app')
        const listener = await App.addListener('backButton', () => {
          const view = currentViewRef.current
          const defaultView = 'workout' // or 'train' if no active program

          // If on a sub-view, navigate back to the default view
          if (view && view !== defaultView && view !== 'train') {
            setCurrentView(defaultView)
            return
          }

          // If already on the root view, double-tap to exit
          const now = Date.now()
          if (now - lastBackPress < 2000) {
            App.exitApp()
          } else {
            lastBackPress = now
            // Show a brief toast-like message (using console for now, but could use toast)
            if (typeof window !== 'undefined' && (window as any).__showBackToast) {
              (window as any).__showBackToast()
            }
          }
        })

        backButtonCleanup = () => listener.remove()
      } catch {
        // Not on native — safe to ignore
      }
    }

    setupBackButton()
    return () => { backButtonCleanup?.() }
  }, [])

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

  const handleAppleSignIn = async () => {
    setIsLoading(true)
    setError("")

    try {
      await signInWithApple()
      // User will be redirected to Apple
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      setForgotPasswordMessage("Please enter your email address")
      return
    }

    try {
      setIsResetSubmitting(true)
      const result = await requestPasswordReset(forgotPasswordEmail)
      setForgotPasswordMessage(result.message)
      // Clear the email field after a short delay
      setTimeout(() => {
        setForgotPasswordEmail("")
        setForgotPasswordMessage("")
        setShowForgotPasswordModal(false)
      }, 3000)
    } catch (err) {
      setForgotPasswordMessage(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsResetSubmitting(false)
    }
  }

  

  const handleStartWorkout = () => {
    setCurrentView("workout")
  }

  const handleViewChange = (view: string) => {
    // INSTANT: Switch view immediately — no async calls for responsive UX
    if (view === "train") {
      // Use tracked state instead of async getActiveProgram() call
      setCurrentView(hasActiveProgram ? "workout" : "train")
    } else {
      setCurrentView(view as "dashboard" | "programs" | "workout" | "analytics" | "train" | "profile")
    }

    // BACKGROUND: Preload data for adjacent/likely next tabs (non-blocking)
    // PERF FIX: Use skipDatabaseLoad — prefetch only needs localStorage, not Supabase
    if (typeof window !== "undefined") {
      // Fire-and-forget preloading - don't await
      switch (view) {
        case "programs":
          // User in Programs might go to Train next
          ProgramStateManager.getActiveProgram({ skipDatabaseLoad: true }).catch(() => {})
          break
        case "train":
        case "workout":
          // User in Train/Workout might go to Programs next
          ProgramStateManager.getAllTemplates().catch(() => {})
          break
        case "analytics":
          // User in Analytics might go to Train next
          ProgramStateManager.getActiveProgram({ skipDatabaseLoad: true }).catch(() => {})
          break
      }
    }
  }

  const handleProgramStarted = () => {
    setHasActiveProgram(true)
    setProgramKey((prev) => prev + 1)
    setCurrentView("workout")
  }

  const handleWorkoutComplete = () => {
    // Program state is already updated in workout-logger component
    // Force a re-render by incrementing the programKey
    // This will cause the WorkoutLoggerComponent to remount with the new workout data
    console.log("[v0] handleWorkoutComplete called - workout completed")
    setProgramKey((prev) => prev + 1)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="text-3xl font-bold text-gradient">OverTrain</div>
          <div className="space-y-2">
            <div className="text-muted-foreground">Authenticating...</div>
            {dataLoadingStatus && (
              <div className="text-sm text-muted-foreground animate-pulse">
                {dataLoadingStatus}
              </div>
            )}
          </div>
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  if (user && !user.gender) {
    return <IntakeForm />
  }

  // Show loading while determining initial view
  if (user && currentView === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="text-3xl font-bold text-gradient">OverTrain</div>
          <div className="text-muted-foreground">Loading your workout data...</div>
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  // Render all views at once and show/hide with CSS to preserve component state
  // This keeps components mounted and prevents loading spinners on tab switches
  if (user && (currentView === "programs" || currentView === "train" || currentView === "workout" || currentView === "analytics" || currentView === "profile")) {
    return (
      <div className="flex h-screen bg-background overflow-hidden touch-action-none" style={{ touchAction: 'pan-y' }}>
        <SidebarNavigation currentView={currentView} onViewChange={handleViewChange} hasActiveProgram={hasActiveProgram} />

        {/* Programs Section - Hidden but mounted */}
        <div
          className="flex-1 lg:ml-64 overflow-y-auto overflow-x-hidden h-screen"
          style={{
            display: currentView === "programs" ? "block" : "none",
            pointerEvents: currentView === "programs" ? "auto" : "none"
          }}
        >
          <ProgramsSection
            onAddProgram={() => setCurrentView("programs")}
            onProgramStarted={handleProgramStarted}
            onNavigateToTrain={() => handleViewChange("train")}
          />
        </div>

        {/* Train Section - Hidden but mounted */}
        <div
          className="flex-1 lg:ml-64 overflow-y-auto overflow-x-hidden h-screen"
          style={{
            display: currentView === "train" ? "block" : "none",
            pointerEvents: currentView === "train" ? "auto" : "none"
          }}
        >
          <TrainSection
            onStartWorkout={handleStartWorkout}
            onAddProgram={() => setCurrentView("programs")}
            shouldAutoStart={currentView === "train"}
          />
        </div>

        {/* Workout Section - Hidden but mounted */}
        <div
          className="flex-1 lg:ml-64 overflow-y-auto overflow-x-hidden h-screen"
          style={{
            display: currentView === "workout" ? "block" : "none",
            pointerEvents: currentView === "workout" ? "auto" : "none"
          }}
        >
          <WorkoutLoggerComponent
            key={programKey}
            onComplete={handleWorkoutComplete}
            onCancel={() => setCurrentView("train")}
            onViewAnalytics={() => setCurrentView("analytics")}
          />
        </div>

        {/* Analytics Section - Hidden but mounted */}
        <div
          className="flex-1 lg:ml-64 overflow-y-auto overflow-x-hidden h-screen"
          style={{
            display: currentView === "analytics" ? "block" : "none",
            pointerEvents: currentView === "analytics" ? "auto" : "none"
          }}
        >
          <MobileAnalyticsTab
            onLogWorkout={() => setCurrentView("train")}
          />
        </div>

        {/* Profile Section - Hidden but mounted */}
        <div
          className="flex-1 lg:ml-64 overflow-y-auto overflow-x-hidden h-screen"
          style={{
            display: currentView === "profile" ? "block" : "none",
            pointerEvents: currentView === "profile" ? "auto" : "none"
          }}
        >
          <ProfileSection />
        </div>

        <BottomNavigation currentView={currentView} onViewChange={handleViewChange} hasActiveProgram={hasActiveProgram} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile & Tablet Login */}
      <div className="lg:hidden px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-semibold uppercase tracking-[0.5em] text-accent/80">
              Train Smarter
            </span>
            <div className="text-4xl font-black text-gradient">OverTrain</div>
            <p className="text-base text-muted-foreground">
              Break your limits with adaptive programming, analytics, and coaching guidance built for serious athletes.
            </p>
          </div>

          <Card className="gradient-card border-border/50 shadow-2xl shadow-primary/10">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                <ThemeToggle />
              </div>
              <CardDescription className="text-sm text-muted-foreground">
                Sign in to sync your training progress and continue your program.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}
              <AuthTabs idPrefix="mobile"
                formData={formData}
                isLoading={isLoading}
                onInputChange={handleInputChange}
                onAuth={handleAuth}
                onGoogle={handleGoogleSignIn}
                onApple={handleAppleSignIn}
                onForgotPassword={() => setShowForgotPasswordModal(true)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mx-auto mt-12 grid max-w-lg gap-6 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
            <Trophy className="h-8 w-8 text-primary" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Elite Programs</h3>
              <p className="text-sm text-muted-foreground">
                Personalized training phases that adapt as you grow stronger.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
            <TrendingUp className="h-8 w-8 text-accent" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Progress Intelligence</h3>
              <p className="text-sm text-muted-foreground">
                Real-time insights and AI-assisted adjustments keep you on track.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 sm:col-span-2">
            <Zap className="h-8 w-8 text-primary" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Offline Ready</h3>
              <p className="text-sm text-muted-foreground">
                Log workouts anywhere. Your data syncs automatically when you reconnect.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section - Desktop Only */}
      <div className="hidden lg:block">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          
          {/* Animated background elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
          
          <div className="relative container mx-auto px-4 py-24 lg:py-32">
            <div className="text-center space-y-8 max-w-4xl mx-auto">
              <div className="space-y-6">
                {/* Main brand with animated underline */}
                <div className="relative inline-block">
                  <h1 className="text-7xl lg:text-8xl font-black text-gradient text-balance tracking-tight">
                    OverTrain
                  </h1>
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary rounded-full animate-pulse" />
                </div>
                
                {/* Slogan with emphasis */}
                <div className="space-y-2">
                  <p className="text-3xl lg:text-4xl font-bold text-primary">
                    Go One More
                  </p>
                  <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto text-pretty font-medium">
                    Track Every Rep. Break Every Limit. Become Unstoppable.
                  </p>
                </div>
              </div>

              {/* CTA Button */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                <Button size="lg" className="gradient-primary text-primary-foreground px-8 py-4 text-lg font-semibold hover:scale-105 transition-transform">
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

      {/* Login Section - Desktop Only */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto">
            <Card className="gradient-card border-border/50">
              <CardHeader className="text-center">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <CardTitle className="text-2xl font-bold">Start Breaking Limits</CardTitle>
                    <CardDescription>Join the elite community that refuses to settle</CardDescription>
                  </div>
                  <ThemeToggle />
                </div>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
                )}
                <AuthTabs idPrefix="desktop"
                  formData={formData}
                  isLoading={isLoading}
                  onInputChange={handleInputChange}
                  onAuth={handleAuth}
                  onGoogle={handleGoogleSignIn}
                  onApple={handleAppleSignIn}
                  onForgotPassword={() => setShowForgotPasswordModal(true)}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <div className="hidden lg:block">
          <div className="container mx-auto px-4 py-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold mb-4">Break Through Every Plateau</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Advanced tools designed for serious athletes who refuse to settle
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="gradient-card border-border/50 hover:scale-105 transition-transform cursor-pointer group">
                <CardHeader className="text-center">
                  <div className="relative inline-block mb-4">
                    <Trophy className="h-16 w-16 text-primary mx-auto group-hover:animate-pulse" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                      <Flame className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold">Breakthrough Performance</CardTitle>
                  <CardDescription className="text-lg">
                    AI-powered progression that pushes you past limits while preventing burnout
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="gradient-card border-border/50 hover:scale-105 transition-transform cursor-pointer group">
                <CardHeader className="text-center">
                  <div className="relative inline-block mb-4">
                    <BarChart3 className="h-16 w-16 text-accent mx-auto group-hover:animate-pulse" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Target className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold">Intelligent Analytics</CardTitle>
                  <CardDescription className="text-lg">
                    Real-time insights that optimize every training session for maximum results
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="gradient-card border-border/50 hover:scale-105 transition-transform cursor-pointer group">
                <CardHeader className="text-center">
                  <div className="relative inline-block mb-4">
                    <Zap className="h-16 w-16 text-primary mx-auto group-hover:animate-pulse" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                      <Award className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold">Elite Training Power</CardTitle>
                  <CardDescription className="text-lg">
                    Mobile-optimized with offline capabilities for training anywhere, anytime
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section - Desktop Only */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Everything you need to know about breaking your limits
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="gradient-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">What makes OverTrain different?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    OverTrain uses AI-powered progression algorithms that adapt to your performance, preventing plateaus and burnout while pushing you to achieve breakthrough results. Our intelligent analytics provide real-time insights to optimize every training session.
                  </p>
                </CardContent>
              </Card>

              <Card className="gradient-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Is OverTrain suitable for beginners?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Absolutely! OverTrain is designed for all fitness levels. Our AI progression system adapts to your experience and automatically adjusts intensity and volume. Whether you're just starting or are an experienced athlete, OverTrain will help you progress safely and effectively.
                  </p>
                </CardContent>
              </Card>

              <Card className="gradient-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Can I use OverTrain offline?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Yes! OverTrain is built with offline capabilities. You can log workouts, access your programs, and view your progress without an internet connection. Your data syncs automatically when you're back online.
                  </p>
                </CardContent>
              </Card>

              <Card className="gradient-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">How does the "Go One More" philosophy work?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    "Go One More" is our core philosophy. It's about pushing past your perceived limits safely and intelligently. Our system knows when to challenge you for growth and when to allow recovery, ensuring consistent progress without overtraining.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - All Devices */}
      <div className="border-t border-border/50 mt-auto">
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-8 text-center md:grid-cols-4 md:text-left">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">OverTrain</div>
              <div className="text-sm text-muted-foreground">Break Your Limits</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">&copy; 2025 OverTrain</div>
              <div className="text-xs text-muted-foreground">All rights reserved</div>
            </div>
            <div className="space-y-2">
              <Link
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                href="/privacy-policy"
              >
                Privacy Policy
              </Link>
              <Link
                className="block text-xs text-muted-foreground transition-colors hover:text-foreground"
                href="/terms"
              >
                Terms & Conditions
              </Link>
            </div>
            <div className="space-y-2">
              <Link
                className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                href="/support"
              >
                Support
              </Link>
              <a
                className="block text-xs text-muted-foreground transition-colors hover:text-foreground"
                href="mailto:support@overtrain.app"
              >
                support@overtrain.app
              </a>
            </div>
          </div>

        </div>
      </div>

      <ForgotPasswordModal
        open={showForgotPasswordModal}
        onOpenChange={setShowForgotPasswordModal}
        email={forgotPasswordEmail}
        setEmail={setForgotPasswordEmail}
        message={forgotPasswordMessage}
        setMessage={setForgotPasswordMessage}
        onSubmit={handleForgotPassword}
        submitting={isResetSubmitting}
      />
    </div>
  )
}
