import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Smartphone, Globe, Mail, Trash2, Download, AlertTriangle } from "lucide-react"

export const metadata: Metadata = {
  title: "Delete Your Account | OverTrain",
  description: "Learn how to permanently delete your OverTrain account and all associated data.",
}

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl py-12 md:py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Delete Your Account
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We're sorry to see you go. Here's how to permanently delete your OverTrain account and all your data.
          </p>
        </div>

        {/* Important Notice */}
        <Card className="mb-8 border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Important: This Action Cannot Be Undone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>When you delete your account, the following data will be <strong>permanently removed</strong>:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Your profile and account information</li>
              <li>All workout history and progress data</li>
              <li>Active programs and in-progress workouts</li>
              <li>Analytics and performance metrics</li>
              <li>All saved preferences and settings</li>
            </ul>
            <p className="pt-2 font-semibold">
              We recommend exporting your data before deletion if you want to keep a backup.
            </p>
          </CardContent>
        </Card>

        {/* Deletion Methods */}
        <div className="space-y-6 mb-12">
          <h2 className="text-2xl font-bold">How to Delete Your Account</h2>

          {/* Method 1: In-App (Mobile) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Method 1: In the Mobile App (Recommended)
              </CardTitle>
              <CardDescription>
                Delete your account directly from the iOS or Android app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-3 text-sm">
                <li>Open the OverTrain app on your device</li>
                <li>Tap <strong>Profile</strong> in the bottom navigation bar</li>
                <li>Tap the <strong>Settings</strong> tab at the top</li>
                <li>Scroll down to the <strong>Data Management</strong> section</li>
                <li>
                  <em>(Optional)</em> Tap <strong>Export Data</strong> to download a backup of your data
                </li>
                <li>Tap the <strong>Delete Account</strong> button</li>
                <li>Read the warning carefully and confirm deletion</li>
                <li>Your account will be permanently deleted immediately</li>
              </ol>
              <div className="pt-4 flex gap-4">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://apps.apple.com/app/overtrain" target="_blank" rel="noopener noreferrer">
                    Download on iOS
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://play.google.com/store/apps/details?id=com.overtrain.app" target="_blank" rel="noopener noreferrer">
                    Download on Android
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Method 2: Web App */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Method 2: On the Web
              </CardTitle>
              <CardDescription>
                Delete your account from any web browser
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-3 text-sm">
                <li>
                  Go to{" "}
                  <a href="https://overtrain.app" className="text-primary underline" target="_blank" rel="noopener noreferrer">
                    overtrain.app
                  </a>
                </li>
                <li>Sign in to your account</li>
                <li>Click <strong>Profile</strong> in the navigation</li>
                <li>Click the <strong>Settings</strong> tab</li>
                <li>Scroll to <strong>Data Management</strong></li>
                <li>
                  <em>(Optional)</em> Click <strong>Export Data</strong> to download a backup
                </li>
                <li>Click <strong>Delete Account</strong></li>
                <li>Confirm deletion in the dialog</li>
              </ol>
              <Button asChild>
                <a href="https://overtrain.app" target="_blank" rel="noopener noreferrer">
                  Go to Web App
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Method 3: Email Support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Method 3: Contact Support
              </CardTitle>
              <CardDescription>
                If you can't access the app, email us to delete your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                If you're unable to delete your account using the methods above, please contact our support team:
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm mb-2">
                  <strong>Email:</strong>{" "}
                  <a href="mailto:support@overtrain.app" className="text-primary underline">
                    support@overtrain.app
                  </a>
                </p>
                <p className="text-sm text-muted-foreground">
                  Include "Delete My Account" in the subject line and provide the email address associated with your account.
                  We'll process your request within 24-48 hours.
                </p>
              </div>
              <Button variant="outline" asChild>
                <a href="mailto:support@overtrain.app?subject=Delete%20My%20Account">
                  Email Support
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Export Data Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Your Data Before Deletion
            </CardTitle>
            <CardDescription>
              Download a copy of your workout data, progress, and analytics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Before deleting your account, you can export all your data as a JSON file. This includes:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-4">
              <li>Profile information (name, preferences, goals)</li>
              <li>Complete workout history with sets, reps, and weights</li>
              <li>In-progress workouts</li>
              <li>Active programs and program history</li>
              <li>Personal records and one-rep maxes</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              The data export feature is available in the same location as the Delete Account button (Profile → Settings → Data Management).
            </p>
          </CardContent>
        </Card>

        {/* Data Retention Policy */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Data Retention Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              When you delete your account:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Immediate deletion:</strong> Your account and personal data are deleted from our active systems immediately
              </li>
              <li>
                <strong>Backup retention:</strong> Data may remain in encrypted backups for up to 30 days before being permanently purged
              </li>
              <li>
                <strong>No recovery:</strong> After deletion, your account cannot be recovered or restored
              </li>
              <li>
                <strong>Anonymized analytics:</strong> Some aggregated, anonymized usage statistics may be retained for product improvement (contains no personal information)
              </li>
            </ul>
            <p className="pt-2">
              For more information, see our{" "}
              <Link href="/privacy-policy" className="text-primary underline">
                Privacy Policy
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        {/* Alternative Options */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Not Ready to Delete?</CardTitle>
            <CardDescription>
              Consider these alternatives before permanently deleting your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Take a Break</h3>
                <p className="text-sm text-muted-foreground">
                  Simply sign out and take a break. Your data will be waiting when you return.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Export Your Data</h3>
                <p className="text-sm text-muted-foreground">
                  Download your workout history to keep a personal record, even if you stop using the app.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Contact Support</h3>
                <p className="text-sm text-muted-foreground">
                  Having issues? Our support team is here to help resolve any problems.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Share Feedback</h3>
                <p className="text-sm text-muted-foreground">
                  Let us know how we can improve. Your feedback helps make OverTrain better for everyone.
                </p>
              </div>
            </div>
            <div className="pt-4 flex gap-4">
              <Button variant="outline" asChild>
                <Link href="/support">Contact Support</Link>
              </Button>
              <Button variant="outline" asChild>
                <a href="mailto:info@overtrain.app?subject=Feedback">Send Feedback</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Need help?{" "}
            <Link href="/support" className="text-primary underline">
              Contact Support
            </Link>{" "}
            |{" "}
            <Link href="/privacy-policy" className="text-primary underline">
              Privacy Policy
            </Link>{" "}
            |{" "}
            <Link href="/terms" className="text-primary underline">
              Terms & Conditions
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
