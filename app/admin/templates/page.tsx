"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { AdminTemplateBuilder } from "@/components/templates/admin-template-builder"
import { TemplateTable } from "@/components/templates/template-table"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarNavigation } from "@/components/sidebar-navigation"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

const DEFAULT_VIEW = "templates"

export default function AdminTemplatesPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [currentView, setCurrentView] = useState<string>(DEFAULT_VIEW)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "builder">("list")
  const [builderMode, setBuilderMode] = useState<"create" | "edit" | "duplicate">("create")
  const [builderTemplateId, setBuilderTemplateId] = useState<string | null>(null)
  const [tableRefreshKey, setTableRefreshKey] = useState(0)

  useEffect(() => {
    if (!isLoading && user && !user.isAdmin) {
      router.replace("/")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setAccessToken(data.session?.access_token ?? null))
    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null)
    })
    return () => subscription?.data.subscription.unsubscribe()
  }, [])

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

  const navigateToApp = (view: string) => {
    setCurrentView(view)
    if (view === DEFAULT_VIEW) {
      router.push("/admin/templates")
      return
    }
    router.push("/")
  }

  const handleViewChange = (view: string) => {
    if (view === DEFAULT_VIEW) {
      setCurrentView(DEFAULT_VIEW)
      router.push("/admin/templates")
      return
    }

    navigateToApp(view)
  }

  const openBuilder = (mode: "create" | "edit" | "duplicate", templateId: string | null = null) => {
    setBuilderMode(mode)
    setBuilderTemplateId(templateId)
    setViewMode("builder")
  }

  const handleBuilderBack = () => {
    setViewMode("list")
    setBuilderMode("create")
    setBuilderTemplateId(null)
  }

  const handleBuilderSaved = () => {
    setTableRefreshKey((value) => value + 1)
    handleBuilderBack()
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNavigation currentView={currentView} onViewChange={handleViewChange} />

      <div className="flex-1 lg:pl-64">
        <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => navigateToApp("train")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <span className="text-sm font-medium">Templates</span>
            <div className="w-16" />
          </div>
        </div>

        <main className="px-4 py-6 pb-24 lg:pb-10 space-y-4">
          {viewMode === "list" ? (
            <TemplateTable
              accessToken={accessToken}
              refreshKey={tableRefreshKey}
              onCreate={() => openBuilder("create")}
              onEdit={(templateId) => openBuilder("edit", templateId)}
              onDuplicate={(templateId) => openBuilder("duplicate", templateId)}
            />
          ) : (
            <AdminTemplateBuilder
              mode={builderMode}
              templateId={builderTemplateId}
              accessToken={accessToken}
              onBack={handleBuilderBack}
              onSaved={handleBuilderSaved}
            />
          )}
        </main>
      </div>

      <BottomNavigation currentView={currentView} onViewChange={handleViewChange} />
    </div>
  )
}
