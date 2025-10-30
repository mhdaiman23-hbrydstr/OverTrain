"use client"
import { Button } from "@/components/ui/button"
import { Dumbbell, Calendar, BarChart3, User, HelpCircle, LogOut, FilePlus2, MessageSquare, Check, AlertCircle, Wifi, WifiOff } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface SidebarNavigationProps {
  currentView: string
  onViewChange: (view: string) => void
}

export function SidebarNavigation({ currentView, onViewChange }: SidebarNavigationProps) {
  const { signOut, user } = useAuth()
  const router = useRouter()
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'failed' | 'offline'>('synced')
  const [isOnline, setIsOnline] = useState(true)
  const isAdmin = !!user?.isAdmin

  // Listen for sync status updates
  useEffect(() => {
    const handleSyncStatus = (event: any) => {
      if (event.detail?.status) {
        setSyncStatus(event.detail.status)
      }
    }

    // Monitor online/offline status
    const handleOnline = () => {
      setIsOnline(true)
      setSyncStatus('syncing')
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSyncStatus('offline')
    }

    if (typeof window !== "undefined") {
      window.addEventListener('syncStatusChanged', handleSyncStatus)
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      // Set initial online status
      setIsOnline(navigator.onLine)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener('syncStatusChanged', handleSyncStatus)
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  const baseNavigationItems = [
    { id: "train", label: "Train", icon: Dumbbell },
    { id: "programs", label: "Programs", icon: Calendar },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "profile", label: "Profile", icon: User },
  ]
  const navigationItems = isAdmin
    ? [...baseNavigationItems, { id: "templates", label: "Templates", icon: FilePlus2 }]
    : baseNavigationItems

  const settingsItems = [
    { id: "help", label: "Help", icon: HelpCircle },
  ]

  const handleHelpClick = () => {
    // Navigate to profile and then to help section
    onViewChange("profile")
    // Use a timeout to ensure the profile view is loaded first
    setTimeout(() => {
      // Dispatch a custom event to navigate to help tab
      window.dispatchEvent(new CustomEvent('navigateToHelpTab'))
    }, 100)
  }

  const handleLeaveReviewClick = () => {
    // Navigate to profile and then to help -> feedback -> general
    onViewChange("profile")
    // Use a timeout to ensure the profile view is loaded first
    setTimeout(() => {
      // Dispatch a custom event to navigate to feedback tab with general selected
      window.dispatchEvent(new CustomEvent('navigateToFeedbackTab', { detail: { type: 'general' } }))
    }, 100)
  }

  const handleSignOut = () => {
    setShowSignOutDialog(true)
  }

  const confirmSignOut = () => {
    signOut()
    setShowSignOutDialog(false)
  }

  return (
    <>
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-muted/30 border-r border-border">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">LL</span>
            </div>
            <div>
              <div className="font-semibold text-sm">Lift Log</div>
              <div className="text-xs text-muted-foreground">Leave the Science to Us</div>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigationItems.map((item) => (
          <Button
            key={item.id}
            variant={currentView === item.id ? "secondary" : "ghost"}
            className="w-full justify-start text-sm font-normal"
            onClick={() => {
              if (item.id === "templates") {
                router.push("/admin/templates")
                return
              }
              onViewChange(item.id)
            }}
          >
              <item.icon className="mr-3 h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>

        {/* Settings */}
        <div className="px-2 py-4 border-t border-border space-y-1">
          {settingsItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className="w-full justify-start text-sm font-normal"
              onClick={item.id === "help" ? handleHelpClick : () => onViewChange(item.id)}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.label}
            </Button>
          ))}

          {/* Leave Your Review Button */}
          <Button
            variant="ghost"
            className="w-full justify-start text-sm font-normal"
            onClick={handleLeaveReviewClick}
          >
            <MessageSquare className="mr-3 h-4 w-4" />
            Leave Your Review
          </Button>

          <Button 
            variant="ghost" 
            className="w-full justify-start text-sm font-normal text-destructive hover:text-destructive hover:bg-destructive/10" 
            onClick={handleSignOut}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign out
          </Button>
        </div>

        {/* Version & Sync Status */}
        <div className="px-4 py-3 text-xs border-t border-border space-y-2">
          <div className="text-muted-foreground">Version 0.9.11</div>

          {/* Sync Status Indicator */}
          <div className="flex items-center gap-2">
            {syncStatus === 'synced' && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-500">
                <Check className="h-3 w-3" />
                <span>Synced</span>
              </div>
            )}
            {syncStatus === 'syncing' && (
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-500 animate-pulse">
                <Wifi className="h-3 w-3 animate-spin" />
                <span>Syncing...</span>
              </div>
            )}
            {syncStatus === 'failed' && (
              <div className="flex items-center gap-1 text-red-600 dark:text-red-500" title="Sync failed - will retry">
                <AlertCircle className="h-3 w-3" />
                <span>Sync failed</span>
              </div>
            )}
            {syncStatus === 'offline' && (
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
                <WifiOff className="h-3 w-3" />
                <span>Offline</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You'll need to sign in again to access your account and workout data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSignOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
