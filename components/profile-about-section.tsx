"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Dumbbell, FileText, Shield, HelpCircle, Headphones } from "lucide-react"
import { APP_VERSION } from "@/lib/version"

interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2025-10-28",
    changes: [
      "Initial public release",
      "Gender-specific workout programs with progressive overload",
      "RPE/RIR tracking with block-level and per-exercise targets",
      "Analytics dashboard with progress charts and consistency heatmap",
      "Cloud sync and data export",
    ],
  },
  {
    version: "0.9.0",
    date: "2025-10-15",
    changes: [
      "Added program wizard for custom template creation",
      "Workout logger refactored into modular component architecture",
      "1RM provider context for percentage-based progression",
      "PWA install prompts for iOS and Android",
    ],
  },
  {
    version: "0.8.0",
    date: "2025-09-20",
    changes: [
      "Supabase authentication and profile management",
      "Feedback system with email delivery",
      "Privacy policy and terms of service pages",
      "Admin support management panel",
    ],
  },
]

export function ProfileAboutSection() {
  return (
    <div className="space-y-6">
      {/* App Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Dumbbell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">OverTrain: Go One More</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                Version <Badge variant="secondary">{APP_VERSION}</Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            A fitness tracking app built for progressive overload. Gender-specific programs,
            RPE/RIR tracking, analytics, and auto-progression to help you get stronger every week.
          </p>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Built by SocialSquare
          </p>
        </CardContent>
      </Card>

      {/* Changelog */}
      <Card>
        <CardHeader>
          <CardTitle>What&apos;s New</CardTitle>
          <CardDescription>Recent updates and improvements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {CHANGELOG.map((entry, index) => (
            <div key={entry.version}>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline">v{entry.version}</Badge>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </div>
              <ul className="list-disc pl-6 space-y-1">
                {entry.changes.map((change, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{change}</li>
                ))}
              </ul>
              {index < CHANGELOG.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
              <Link href="/faq">
                <HelpCircle className="h-4 w-4 mr-3 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-sm">FAQ</div>
                  <div className="text-xs text-muted-foreground">Common questions</div>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
              <Link href="/support">
                <Headphones className="h-4 w-4 mr-3 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-sm">Support</div>
                  <div className="text-xs text-muted-foreground">Get help from our team</div>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
              <Link href="/privacy-policy">
                <Shield className="h-4 w-4 mr-3 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-sm">Privacy Policy</div>
                  <div className="text-xs text-muted-foreground">How we handle your data</div>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
              <Link href="/terms">
                <FileText className="h-4 w-4 mr-3 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-sm">Terms & Conditions</div>
                  <div className="text-xs text-muted-foreground">Usage terms</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
