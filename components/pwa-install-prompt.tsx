"use client"

import { useState, useEffect } from "react"
import { X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if it's iOS
    const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(isApple)

    // Handle beforeinstallprompt for Android and other PWA-capable browsers
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const event = e as BeforeInstallPromptEvent
      setDeferredPrompt(event)
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Handle app already installed
    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null)
      setShowPrompt(false)
    })

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", () => {})
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      console.log("User accepted the install prompt")
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
  }

  const handleIOSInstall = () => {
    // For iOS, show instructions since there's no native prompt
    const message = `
To add OverTrain to your home screen:

1. Tap the Share button at the bottom of your screen
2. Scroll and tap "Add to Home Screen"
3. Tap "Add" in the top right

OverTrain will now appear as an app on your home screen!
    `.trim()

    alert(message)
  }

  // Don't show anything if no install prompt available and not iOS
  if (!showPrompt && !isIOS) return null

  // iOS version with manual instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg rounded-t-lg p-4 flex items-center justify-between gap-4 z-50 animate-in slide-in-from-bottom">
        <div className="flex items-center gap-3 flex-1">
          <Download className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Install OverTrain App</p>
            <p className="text-xs text-muted-foreground">Get app-like experience with offline support</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleIOSInstall}
            className="h-8"
          >
            Install
          </Button>
        </div>
      </div>
    )
  }

  // Android/Web version with native install prompt
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg rounded-t-lg p-4 flex items-center justify-between gap-4 z-50 animate-in slide-in-from-bottom">
      <div className="flex items-center gap-3 flex-1">
        <Download className="h-5 w-5 text-primary flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">Install OverTrain App</p>
          <p className="text-xs text-muted-foreground">Get app-like experience with offline support</p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-8"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={handleInstall}
          className="h-8"
        >
          Install
        </Button>
      </div>
    </div>
  )
}
