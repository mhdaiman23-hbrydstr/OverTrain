"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VolumeTrendChart } from "./volume-trend-chart"
import { ConsistencyHeatmap } from "./consistency-heatmap"
import { ACWRStatusCard } from "./acwr-status-card"
import { Lightbulb, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { AdvancedAnalytics } from "@/lib/analytics"

interface OverviewTabContentProps {
  analytics: AdvancedAnalytics
}

export function OverviewTabContent({ analytics }: OverviewTabContentProps) {
  return (
    <div className="space-y-6 mt-4">
      {/* Volume Trend Chart */}
      <VolumeTrendChart trainingLoad={analytics.trainingLoad} />

      {/* Training Load Analysis */}
      <ACWRStatusCard acwr={analytics.acwr} />

      {/* Consistency Heatmap */}
      <ConsistencyHeatmap heatmap={analytics.heatmap} />

      {/* Smart Insights */}
      {analytics.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              Smart Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.insights.slice(0, 3).map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    insight.priority === 'high'
                      ? 'border-l-red-600 bg-red-50/50 dark:bg-red-950/20'
                      : insight.priority === 'medium'
                      ? 'border-l-yellow-600 bg-yellow-50/50 dark:bg-yellow-950/20'
                      : 'border-l-blue-600 bg-blue-50/50 dark:bg-blue-950/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-foreground mb-1">
                        {insight.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {insight.description}
                      </p>
                      {insight.actionable && (
                        <Badge variant="secondary" className="text-xs">
                          {insight.actionText}
                        </Badge>
                      )}
                    </div>
                    {insight.type === 'deload' && (
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consistency Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Consistency Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary">
                {analytics.consistencyScore}%
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Last 30 days
              </p>
            </div>
            <div className="flex-1">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {analytics.consistencyScore >= 80
                    ? '🔥 Amazing consistency! Keep up the excellent work.'
                    : analytics.consistencyScore >= 60
                    ? '💪 Good progress! Try to maintain this streak.'
                    : analytics.consistencyScore >= 40
                    ? '📈 Building momentum! You\'re getting there.'
                    : '🚀 Just getting started! Keep pushing forward.'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
