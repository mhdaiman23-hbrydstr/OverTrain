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
      case 'safe':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'caution':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
      case 'high-risk':
        return <AlertCircle className="h-6 w-6 text-red-600" />
    }
  }

  const getZoneColor = () => {
    switch (acwr.zone) {
      case 'safe':
        return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
      case 'caution':
        return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
      case 'high-risk':
        return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
    }
  }

  const getZoneBadgeVariant = () => {
    switch (acwr.zone) {
      case 'safe':
        return 'bg-green-600'
      case 'caution':
        return 'bg-yellow-600'
      case 'high-risk':
        return 'bg-red-600'
    }
  }

  const zoneLabel = {
    safe: 'Safe Zone',
    caution: 'Caution Zone',
    'high-risk': 'High Risk Zone'
  }

  if (acwr.acuteLoad === 0 && acwr.chronicLoad === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Training Load Analysis</CardTitle>
          <CardDescription>Acute/Chronic Workload Ratio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p>Need at least 7 days of data to calculate ACWR</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-2", getZoneColor())}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Training Load Analysis</CardTitle>
            <CardDescription>Acute/Chronic Workload Ratio (ACWR)</CardDescription>
          </div>
          <MobileTooltip
            content={
              <div className="space-y-1">
                <p className="font-semibold">How ACWR is Calculated:</p>
                <p>ACWR = Acute Load ÷ Chronic Load</p>
                <p className="text-xs mt-2">
                  • <strong>Acute Load:</strong> Total volume from last 7 days (volume = weight × reps × RPE factor)<br/>
                  • <strong>Chronic Load:</strong> Average daily volume over last 28 days
                </p>
                <p className="text-xs mt-2">
                  Safe: 0.8-1.3 | Caution: 1.3-1.5 | High Risk: &gt;1.5
                </p>
              </div>
            }
            side="left"
            className="max-w-xs"
          >
            <HelpCircle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
          </MobileTooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Current Zone</div>
            <div className="flex items-center gap-2 mt-1">
              {getZoneIcon()}
              <Badge className={cn("text-white", getZoneBadgeVariant())}>
                {zoneLabel[acwr.zone]}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">ACWR Ratio</div>
            <div className="text-3xl font-bold">{acwr.ratio.toFixed(2)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <MobileTooltip
            content="Total training load from the last 7 days"
            side="bottom"
          >
            <div className="p-3 bg-muted/30 rounded-lg cursor-help">
              <div className="text-xs text-muted-foreground">Acute Load (7d)</div>
              <div className="text-xl font-semibold mt-1">{acwr.acuteLoad}</div>
            </div>
          </MobileTooltip>
          <MobileTooltip
            content="Average daily training load over the last 28 days"
            side="bottom"
          >
            <div className="p-3 bg-muted/30 rounded-lg cursor-help">
              <div className="text-xs text-muted-foreground">Chronic Load (28d)</div>
              <div className="text-xl font-semibold mt-1">{acwr.chronicLoad}</div>
            </div>
          </MobileTooltip>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-xs font-medium text-foreground mb-1">Recommendation</div>
          <div className="text-sm text-muted-foreground">
            {acwr.recommendation}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
