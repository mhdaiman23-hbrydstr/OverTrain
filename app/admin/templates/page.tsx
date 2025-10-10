"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminTemplateBuilder } from "@/components/templates/admin-template-builder"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminTemplatesPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && !user.isAdmin) {
      router.replace("/")
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
            <p>You need admin access to manage program templates.</p>
            <p>If you believe this is an error, contact the LiftLog team.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6">
      <AdminTemplateBuilder />
    </div>
  )
}
