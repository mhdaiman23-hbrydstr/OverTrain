"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crown, Sparkles, Lock } from "lucide-react"

export function SubscriptionManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Manage Subscriptions
        </CardTitle>
        <CardDescription>
          View your current subscription plan and available features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Plan */}
        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Free Tier</h3>
                <Badge variant="secondary" className="text-xs">
                  BETA
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                You're currently enjoying LiftLog for free during our beta period
              </p>
            </div>
          </div>
        </div>

        {/* Current Features */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Current Features</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
              <span>Complete workout logging</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
              <span>Progress tracking and analytics</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
              <span>Program creation and management</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
              <span>Exercise library with filtering</span>
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium text-sm text-muted-foreground">Premium Features Coming Soon</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            We're working on advanced analytics, custom workout templates, and more premium features. Stay tuned!
          </p>
        </div>

        {/* Beta Notice */}
        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground">
            Thank you for being part of our beta community! 🎉
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
