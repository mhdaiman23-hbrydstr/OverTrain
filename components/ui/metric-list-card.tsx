"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface MetricListItem {
  label: string
  value: string | number
  badge?: { label: string; variant?: "default" | "secondary" | "outline" }
  trend?: "up" | "down" | "stable"
  trendValue?: string | number
  secondary?: string | ReactNode
}

interface MetricListCardProps {
  title: string
  description?: string
  items: MetricListItem[]
  variant?: "default" | "minimal"
  size?: "sm" | "md"
  showTrendIcons?: boolean
  className?: string
}

/**
 * MetricListCard - Specialized card for displaying lists of metrics
 *
 * Perfect for:
 * - Strength gains by muscle group
 * - Weekly progress summaries
 * - Analytics breakdowns
 * - Performance metrics
 *
 * Features:
 * - Clean list layout with metrics
 * - Optional trend indicators (up/down/stable)
 * - Status badges
 * - Secondary information display
 * - Responsive sizing
 *
 * Example:
 * ```tsx
 * <MetricListCard
 *   title="Strength Gains"
 *   description="Percentage increase by muscle group"
 *   items={[
 *     {
 *       label: "Chest",
 *       value: "+15%",
 *       trend: "up",
 *       trendValue: "+5kg"
 *     },
 *     {
 *       label: "Back",
 *       value: "+8%",
 *       trend: "up",
 *       trendValue: "+3kg"
 *     }
 *   ]}
 *   showTrendIcons={true}
 * />
 * ```
 */
export function MetricListCard({
  title,
  description,
  items,
  variant = "default",
  size = "md",
  showTrendIcons = true,
  className,
}: MetricListCardProps) {
  const getTrendIcon = (trend?: string) => {
    if (!showTrendIcons) return null

    switch (trend) {
      case "up":
        return (
          <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
        )
      case "down":
        return (
          <TrendingDown className="h-4 w-4 text-red-600 flex-shrink-0" />
        )
      case "stable":
        return (
          <Minus className="h-4 w-4 text-yellow-600 flex-shrink-0" />
        )
      default:
        return null
    }
  }

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}

      <CardContent className={cn(
        size === "sm" ? "p-4" : "p-6",
        "space-y-2"
      )}>
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center justify-between p-3 border border-border/30 rounded-lg",
              "hover:bg-muted/30 transition-colors"
            )}
          >
            {/* Left: Label + Secondary */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {getTrendIcon(item.trend)}
                <span className={cn(
                  "font-medium text-foreground",
                  size === "sm" ? "text-sm" : "text-base"
                )}>
                  {item.label}
                </span>
              </div>
              {item.secondary && (
                <div className={cn(
                  "text-muted-foreground mt-0.5",
                  size === "sm" ? "text-xs" : "text-sm"
                )}>
                  {typeof item.secondary === "string" ? (
                    <>{item.secondary}</>
                  ) : (
                    item.secondary
                  )}
                </div>
              )}
            </div>

            {/* Right: Badge + Value */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.badge && (
                <Badge variant={item.badge.variant} className="text-xs">
                  {item.badge.label}
                </Badge>
              )}
              <div className={cn(
                "font-bold text-right",
                size === "sm" ? "text-sm" : "text-base"
              )}>
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
