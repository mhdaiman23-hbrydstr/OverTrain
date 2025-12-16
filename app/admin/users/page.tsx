"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminDashboard } from "../components/admin-dashboard"
import { useAuth } from "@/contexts/auth-context"

const DEFAULT_VIEW = "users"

export default function AdminUsersPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

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
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Restricted Area</h1>
          <p className="text-muted-foreground mb-4">
            You need admin access to view the users management.
          </p>
          <p className="text-sm text-muted-foreground">
            If you believe this is an error, contact the LiftLog team.
          </p>
        </div>
      </div>
    )
  }

  return <AdminDashboard initialView={DEFAULT_VIEW} />
}
