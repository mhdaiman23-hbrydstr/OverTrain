"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface ProgramCardProps {
  title: string
  description: string
  difficulty?: "Beginner" | "Intermediate" | "Advanced"
  duration?: string
  workouts?: number
  frequency?: string
  goals?: string[]
  highlight?: boolean
  action?: ReactNode
  className?: string
  onHover?: boolean
}

/**
 * ProgramCard - Specialized card for displaying program templates
 *
 * Perfect for:
 * - Program recommendations
 * - Template selection
 * - Program browsing
 * - Program comparisons
 *
 * Features:
 * - Difficulty badge with color coding
 * - Program metadata (duration, frequency, workouts)
 * - Multiple goal tags
 * - Optional action button
 * - Hover effects
 * - Highlight state for featured programs
 *
 * Example:
 * ```tsx
 * <ProgramCard
 *   title="Upper/Lower Split"
 *   description="4-day split focused on strength and hypertrophy"
 *   difficulty="Intermediate"
 *   duration="8 weeks"
 *   workouts={16}
 *   frequency="4 days/week"
 *   goals={["Strength", "Hypertrophy", "Definition"]}
 *   action={<Button>Select Program</Button>}
 *   highlight={false}
 * />
 * ```
 */
export function ProgramCard({
  title,
  description,
  difficulty = "Intermediate",
  duration,
  workouts,
  frequency,
  goals,
  highlight = false,
  action,
  className,
  onHover = true,
}: ProgramCardProps) {
  const difficultyColorClasses = {
    Beginner: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
    Intermediate: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
    Advanced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
  }

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        highlight && "border-primary/50 bg-primary/5 shadow-lg",
        onHover && "hover:shadow-lg hover:border-primary/30 cursor-pointer",
        className
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="text-base">
              {description}
            </CardDescription>
          </div>
          {difficulty && (
            <Badge className={difficultyColorClasses[difficulty]}>
              {difficulty}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metadata Grid */}
        {(duration || workouts || frequency) && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {duration && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Duration
                </div>
                <div className="font-semibold text-sm">{duration}</div>
              </div>
            )}
            {frequency && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Frequency
                </div>
                <div className="font-semibold text-sm">{frequency}</div>
              </div>
            )}
            {workouts && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Workouts
                </div>
                <div className="font-semibold text-sm">{workouts}</div>
              </div>
            )}
          </div>
        )}

        {/* Goals */}
        {goals && goals.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Goals
            </div>
            <div className="flex flex-wrap gap-2">
              {goals.map((goal, index) => (
                <Badge key={index} variant="secondary">
                  {goal}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action */}
        {action && (
          <div className="pt-2 border-t border-border/50">
            {action}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
