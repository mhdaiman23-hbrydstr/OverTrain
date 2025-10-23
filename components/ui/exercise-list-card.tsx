"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface ExerciseListCardProps {
  exerciseName: string
  subtitle?: string
  badges?: Array<{ label: string | ReactNode; variant?: "default" | "secondary" | "outline" }>
  metadata?: Array<{ icon?: ReactNode; label: string; value: string | ReactNode }>
  action?: ReactNode
  compact?: boolean
  className?: string
}

/**
 * ExerciseListCard - Specialized card for displaying exercise items in lists
 *
 * Perfect for:
 * - Exercise lists in programs/templates
 * - Workout exercise summaries
 * - Progress tracking by exercise
 * - Template preview lists
 *
 * Features:
 * - Clean exercise name display
 * - Optional metadata (sets, reps, weight, etc.)
 * - Status badges
 * - Compact or spacious layout
 * - Action buttons (edit, delete, etc.)
 *
 * Example:
 * ```tsx
 * <ExerciseListCard
 *   exerciseName="Bench Press"
 *   subtitle="Barbell"
 *   badges={[
 *     { label: "4 sets", variant: "secondary" },
 *     { label: "5 reps", variant: "secondary" }
 *   ]}
 *   metadata={[
 *     { label: "Max Weight:", value: "100kg" },
 *     { label: "Volume:", value: "2000kg" }
 *   ]}
 *   action={<Button variant="ghost" size="icon">...</Button>}
 *   compact={false}
 * />
 * ```
 */
export function ExerciseListCard({
  exerciseName,
  subtitle,
  badges,
  metadata,
  action,
  compact = false,
  className,
}: ExerciseListCardProps) {
  return (
    <Card className={cn("border-border/40", className)}>
      <CardContent className={cn(compact ? "p-3" : "p-4", "space-y-3")}>
        {/* Header: Title + Action */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              "font-semibold truncate",
              compact ? "text-sm" : "text-base"
            )}>
              {exerciseName}
            </h4>
            {subtitle && (
              <p className={cn(
                "text-muted-foreground truncate",
                compact ? "text-xs" : "text-sm"
              )}>
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
        </div>

        {/* Badges */}
        {badges && badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge, index) => (
              <Badge
                key={index}
                variant={badge.variant}
                className={compact ? "text-xs" : "text-sm"}
              >
                {badge.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Metadata Grid */}
        {metadata && metadata.length > 0 && (
          <div className={cn(
            "grid gap-2",
            metadata.length > 2 ? "grid-cols-2" : "grid-cols-1"
          )}>
            {metadata.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "p-2 border border-border/30 rounded-md",
                  compact ? "text-xs" : "text-sm"
                )}
              >
                <div className="flex items-center gap-2">
                  {item.icon && (
                    <div className={cn(
                      "flex-shrink-0 text-muted-foreground",
                      compact ? "h-4 w-4" : "h-5 w-5"
                    )}>
                      {item.icon}
                    </div>
                  )}
                  <div className="flex-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <div className="font-medium text-foreground">
                      {item.value}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
