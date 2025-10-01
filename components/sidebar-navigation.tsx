"use client"
import { Button } from "@/components/ui/button"
import { Dumbbell, Calendar, Zap, FileText, Sun, User, CreditCard, HelpCircle, Star, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface SidebarNavigationProps {
  currentView: string
  onViewChange: (view: string) => void
}

export function SidebarNavigation({ currentView, onViewChange }: SidebarNavigationProps) {
  const { signOut } = useAuth()

  const navigationItems = [
    { id: "workout", label: "Current workout", icon: Dumbbell },
    { id: "programs", label: "Programs", icon: Calendar },
    { id: "exercises", label: "Custom exercises", icon: Zap },
    { id: "templates", label: "Templates", icon: FileText },
  ]

  const settingsItems = [
    { id: "theme", label: "Light Theme", icon: Sun },
    { id: "profile", label: "Profile & Settings", icon: User },
    { id: "subscription", label: "Subscription", icon: CreditCard },
    { id: "help", label: "Help", icon: HelpCircle },
    { id: "review", label: "Leave a review", icon: Star },
  ]

  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-muted/30 border-r border-border">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center h-16 px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">LL</span>
            </div>
            <div>
              <div className="font-semibold text-sm">Lift Log</div>
              <div className="text-xs text-muted-foreground">Leave the Science to Us</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigationItems.map((item) => (
            <Button
              key={item.id}
              variant={currentView === item.id ? "secondary" : "ghost"}
              className="w-full justify-start text-sm font-normal"
              onClick={() => onViewChange(item.id)}
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
              onClick={() => onViewChange(item.id)}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.label}
            </Button>
          ))}

          <Button variant="ghost" className="w-full justify-start text-sm font-normal" onClick={signOut}>
            <LogOut className="mr-3 h-4 w-4" />
            Sign out
          </Button>
        </div>

        {/* Version */}
        <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">Version 0.9.11</div>
      </div>
    </div>
  )
}
