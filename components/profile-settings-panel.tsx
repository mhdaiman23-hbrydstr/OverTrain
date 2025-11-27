"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings, Palette, Bell, Shield, Database, Download, Trash2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

export function ProfileSettingsPanel() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleExportData = async () => {
    if (!user) return

    setIsExporting(true)
    try {
      // Gather all user data from localStorage and database
      const workouts = localStorage.getItem('liftlog_workouts')
      const inProgressWorkouts = localStorage.getItem('liftlog_in_progress_workouts')
      const activeProgram = localStorage.getItem('liftlog_active_program')
      const programHistory = localStorage.getItem('liftlog_program_history')

      const exportData = {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name,
          gender: user.gender,
          experience: user.experience,
          goals: user.goals,
          bodyweight: user.bodyweight,
          oneRepMax: user.oneRepMax,
          preferredUnit: user.preferredUnit,
        },
        workouts: workouts ? JSON.parse(workouts) : [],
        inProgressWorkouts: inProgressWorkouts ? JSON.parse(inProgressWorkouts) : [],
        activeProgram: activeProgram ? JSON.parse(activeProgram) : null,
        programHistory: programHistory ? JSON.parse(programHistory) : [],
        exportedAt: new Date().toISOString(),
      }

      // Create downloadable JSON file
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `overtrain-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Data exported successfully",
        description: "Your workout data has been downloaded as a JSON file.",
      })
    } catch (error) {
      console.error('Failed to export data:', error)
      toast({
        title: "Export failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user || !supabase) return

    setIsDeleting(true)
    try {
      console.log('[Account Delete] Starting account deletion for user:', user.email)

      // Log audit event BEFORE deletion
      try {
        const { logAuditEvent } = await import('@/lib/audit-logger')
        await logAuditEvent({
          action: 'ACCOUNT_DELETED',
          userId: user.id,
          details: { email: user.email, deletedAt: new Date().toISOString() },
          ipAddress: null,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        })
      } catch (auditError) {
        console.error('[Account Delete] Failed to log audit event:', auditError)
        // Don't block deletion if audit logging fails
      }

      // Call Supabase RPC function to delete account
      // This works for both web and native apps (static export)
      const { data: rpcData, error: rpcError } = await supabase.rpc('delete_user_account')

      if (rpcError) {
        console.error('[Account Delete] RPC error:', rpcError)

        // If RPC function doesn't exist yet, guide user to contact support
        if (rpcError.message?.includes('function') || rpcError.code === '42883') {
          throw new Error('Account deletion is not yet configured. Please contact support@overtrain.app to delete your account, or run the database migration first.')
        }

        throw new Error(rpcError.message || 'Failed to delete account')
      }

      // Check if deletion was successful
      if (rpcData && !rpcData.success) {
        throw new Error(rpcData.error || 'Failed to delete account')
      }

      // Clear all local data
      localStorage.clear()

      // Show success message
      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently deleted.",
      })

      // Sign out (which will redirect to landing page)
      await signOut()

    } catch (error) {
      console.error('[Account Delete] Failed:', error)

      // If it's the support message, show it differently
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account. Please try again or contact support.'

      if (errorMessage.includes('contact support')) {
        toast({
          title: "Contact Support Required",
          description: errorMessage,
          variant: "default",
        })
      } else {
        toast({
          title: "Deletion failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how LiftLog looks and feels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Theme</Label>
              <p className="text-sm text-muted-foreground">
                Choose your preferred color theme
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Manage your notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Workout Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get reminded about scheduled workouts
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Progress Updates</Label>
              <p className="text-sm text-muted-foreground">
                Weekly summaries of your fitness progress
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Achievement Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Celebrate when you reach new milestones
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy
          </CardTitle>
          <CardDescription>
            Control your data and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Profile Visibility</Label>
              <p className="text-sm text-muted-foreground">
                Make your profile visible to other users
              </p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Analytics Sharing</Label>
              <p className="text-sm text-muted-foreground">
                Help improve LiftLog with anonymous usage data
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Manage your workout data and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Backup</Label>
              <p className="text-sm text-muted-foreground">
                Automatically backup your workout data
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Data Sync</Label>
              <p className="text-sm text-muted-foreground">
                Sync data across all your devices
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="pt-2">
            <div className="flex gap-2">
              <Badge variant="outline">Last backup: 2 hours ago</Badge>
              <Badge variant="secondary">Synced</Badge>
            </div>
          </div>
          <Separator className="my-4" />

          {/* Data Export */}
          <div className="space-y-2">
            <Label>Export Your Data</Label>
            <p className="text-sm text-muted-foreground">
              Download all your workout data, progress, and profile information as a JSON file
            </p>
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export Data"}
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Account Deletion */}
          <div className="space-y-2">
            <Label className="text-destructive">Delete Account</Label>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto"
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      This action cannot be undone. This will permanently delete your account and remove all your data from our servers, including:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Your profile and account information</li>
                      <li>All workout history and progress data</li>
                      <li>Active programs and in-progress workouts</li>
                      <li>Analytics and performance metrics</li>
                      <li>Any saved preferences or settings</li>
                    </ul>
                    <p className="font-semibold pt-2">
                      Consider exporting your data first if you want to keep a backup.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "Deleting..." : "Yes, delete my account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
