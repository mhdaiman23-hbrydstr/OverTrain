import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Support | OverTrain",
  description: "Get help with OverTrain and find answers to common questions.",
}

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-4xl px-4 py-16 lg:py-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">OverTrain Support</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            We are here to help you unlock your next breakthrough. Choose the option that best fits what you
            need, and our team will take it from there.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>Reach our team directly for personalized help.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Email</div>
                <a className="text-lg font-semibold" href="mailto:support@overtrain.app">
                  support@overtrain.app
                </a>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Response Time</div>
                <p className="text-lg font-semibold">Within 1 business day</p>
              </div>
              <Button asChild className="w-full md:w-auto">
                <a href="mailto:support@overtrain.app">Email Support</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle>In-App Help Center</CardTitle>
              <CardDescription>Guided walkthroughs for logging workouts and training plans.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Access tips, troubleshooting steps, and feature guides directly in the app. Go to the Profile tab
                and tap <strong>Help Center</strong> to view articles tailored to your training experience.
              </p>
              <p className="text-muted-foreground">
                If you run into issues syncing workouts or switching programs, the in-app assistant can help you
                resolve common scenarios in under a minute.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Priority Issues</CardTitle>
              <CardDescription>We escalate the following cases automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>When you contact us, please mention if you are experiencing:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Subscription or billing errors</li>
                <li>Data loss or inaccurate workout history</li>
                <li>Crashes or performance issues on launch</li>
                <li>Accessibility concerns that block your training</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feature Requests & Feedback</CardTitle>
              <CardDescription>Help us shape the next iteration of OverTrain.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                We are constantly refining our AI programming engine and analytics dashboard. Share your ideas or
                vote on upcoming features inside the app by visiting <strong>Profile &gt; Feedback</strong>.
              </p>
              <p>
                You can also email us at{" "}
                <a className="font-medium text-primary underline" href="mailto:product@overtrain.app">
                  product@overtrain.app
                </a>{" "}
                if you prefer to send longer-form product suggestions.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 rounded-lg border border-border/50 bg-muted/30 px-6 py-8 text-center">
          <h2 className="text-2xl font-semibold">Need the basics?</h2>
          <p className="max-w-2xl text-muted-foreground">
            Start with the quick-start guide inside the app to learn how to set goals, choose a program, and log your
            first workout. Visit <strong>Profile &gt; Help Center &gt; Getting Started</strong> for a step-by-step
            walkthrough.
          </p>
        </div>
      </div>
    </main>
  )
}
