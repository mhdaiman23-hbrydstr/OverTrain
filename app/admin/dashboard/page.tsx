"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminDashboard } from "../components/admin-dashboard"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const DEFAULT_VIEW = "dashboard"

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [currentView, setCurrentView] = useState<string>(DEFAULT_VIEW)

  useEffect(() => {
    if (!isLoading && user) {
      // Check if user is admin
      if (!user.isAdmin) {
        router.replace("/")
      }
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading account...</p>
      </div>
    )
  }

  if (!user?.isAdmin) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Restricted Area</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>You need admin access to view the dashboard.</p>
            <p>If you believe this is an error, contact the LiftLog team.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <AdminDashboard />
}
