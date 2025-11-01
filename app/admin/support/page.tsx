"use client"

import { useState, useEffect } from "react"
import { SidebarNavigation } from "@/components/sidebar-navigation"
import { BottomNavigation } from "@/components/bottom-navigation"
import { useAuth } from "@/contexts/auth-context"
import { SupportManagement } from "./components/support-management"

const DEFAULT_VIEW = "support"

export default function SupportPage() {
  const [currentView, setCurrentView] = useState<string>(DEFAULT_VIEW)
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.isAdmin) {
      window.location.href = "/"
    }
  }, [user])

  if (!user?.isAdmin) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    )
  }

  const handleViewChange = (view: string) => {
    setCurrentView(view)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNavigation currentView={currentView} onViewChange={handleViewChange} />

      <div className="flex-1 lg:pl-64">
        <main className="px-4 py-6 pb-24 lg:pb-10">
          <SupportManagement />
        </main>
      </div>

      <BottomNavigation currentView={currentView} onViewChange={handleViewChange} />
    </div>
  )
}
