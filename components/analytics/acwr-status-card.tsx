"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react"
import { MobileTooltip } from "@/components/ui/mobile-tooltip"
import { cn } from "@/lib/utils"
import type { ACWRData } from "@/lib/analytics"

interface ACWRStatusCardProps {
  acwr: ACWRData
}

export function ACWRStatusCard({ acwr }: ACWRStatusCardProps) {
  const getZoneIcon = () => {
    switch (acwr.zone) {
      case "safe":
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case "caution":
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
      case "high-risk":
        return <AlertCircle className="h-6 w-6 text-red-600" />
    }
  }

  const getZoneColor = () => {
    switch (acwr.zone) {
      case "safe":
        return "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
      case "caution":
        return "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
      case "high-risk":
        return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
    }
  }

  const getZoneBadgeVariant = () => {
    switch (acwr.zone) {
      case "safe":
        return "bg-green-600"
      case "caution":
        return "bg-yellow-600"
      case "high-risk":
        return "bg-red-600"
    }
  }

  const zoneLabel = {
    safe: "Safe Zone",
    caution: "Caution Zone",
    "high-risk": "High Risk Zone",
  }

  if (acwr.acuteLoad === 0 && acwr.chronicLoad === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Training Load Analysis</CardTitle>
          <CardDescription>Acute/Chronic Workload Ratio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <p>Need at least 7 days of data to calculate ACWR</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-2", getZoneColor())}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Training Load Analysis</CardTitle>
            <CardDescription>Acute/Chronic Workload Ratio (ACWR)</CardDescription>
          </div>
          <MobileTooltip
            side="left"
            className="max-w-xs"
            content={
              <div className="space-y-1">
                <p className="font-semibold">How ACWR is calculated</p>
                <p>ACWR = Acute Load / Chronic Load</p>
                <p className="mt-2 text-xs">
                  • <strong>Acute Load:</strong> Total volume from the last 7 days (weight × reps × RPE factor)
                  <br />
                  • <strong>Chronic Load:</strong> Average daily volume over the last 28 days
                </p>
                <p className="mt-2 text-xs">Safe: 0.8-1.3 | Caution: 1.3-1.5 | High risk: &gt; 1.5</p>
              </div>
            }
          >
            <button
              type="button"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              aria-label="How ACWR is calculated"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
          </MobileTooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Current Zone</div>
            <div className="mt-1 flex items-center gap-2">
              {getZoneIcon()}
              <Badge className={cn("text-white", getZoneBadgeVariant())}>{zoneLabel[acwr.zone]}</Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">ACWR Ratio</div>
            <div className="text-3xl font-bold">{acwr.ratio.toFixed(2)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <MobileTooltip side="bottom" content="Total training load from the last 7 days">
            <button
              type="button"
              className="w-full cursor-help rounded-lg bg-muted/30 p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              aria-label="Explain acute load"
            >
              <div className="text-xs text-muted-foreground">Acute Load (7d)</div>
              <div className="mt-1 text-xl font-semibold">{acwr.acuteLoad}</div>
            </button>
          </MobileTooltip>
          <MobileTooltip side="bottom" content="Average daily training load over the last 28 days">
            <button
              type="button"
              className="w-full cursor-help rounded-lg bg-muted/30 p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              aria-label="Explain chronic load"
            >
              <div className="text-xs text-muted-foreground">Chronic Load (28d)</div>
              <div className="mt-1 text-xl font-semibold">{acwr.chronicLoad}</div>
            </button>
          </MobileTooltip>
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <div className="mb-1 text-xs font-medium text-foreground">Recommendation</div>
          <div className="text-sm text-muted-foreground">{acwr.recommendation}</div>
        </div>
      </CardContent>
    </Card>
  )
}
