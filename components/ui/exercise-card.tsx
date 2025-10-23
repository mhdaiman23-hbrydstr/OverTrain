"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface ExerciseCardProps {
  children: ReactNode
  status?: "pending" | "current" | "completed" | "warmup"
  zone?: "strength" | "endurance" | "power" | "warmup" | "recovery"
  intensity?: "normal" | "high" | "maximum"
  className?: string
}

/**
 * ExerciseCard - Specialized card component for exercise displays
 *
 * Applies status-based styling, zone-based accents, and intensity-based effects
 *
 * Status variants:
 * - pending: grey border, inactive state
 * - current: red border with shadow, active set
 * - completed: green border, finished set
 * - warmup: orange border, warmup set
 *
 * Zone variants:
 * - strength: red left border accent
 * - endurance: blue left border accent
 * - power: purple left border accent
 * - warmup: orange left border accent
 * - recovery: green left border accent
 *
 * Intensity variants:
 * - normal: standard shadow
 * - high: elevated shadow
 * - maximum: intense shadow with scale effect
 *
 * Example:
 * ```tsx
 * <ExerciseCard status="current" zone="strength" intensity="high">
 *   <h3>Bench Press</h3>
 *   <p>5 sets × 5 reps</p>
 * </ExerciseCard>
 * ```
 */
export function ExerciseCard({
  children,
  status = "pending",
  zone = "strength",
  intensity = "normal",
  className,
}: ExerciseCardProps) {
  return (
    <Card
      className={cn(
        "exercise-card transition-all duration-200 border-2",
        // Status-based styling
        status === "completed" && "border-volt-green/30 bg-volt-green/5",
        status === "current" && "border-signal-red/50 bg-signal-red/5 shadow-intense",
        status === "warmup" && "border-zone-warmup/30 bg-zone-warmup/5",
        status === "pending" && "border-graphite-grey/30 hover:border-graphite-grey/50",

        // Intensity-based effects
        intensity === "high" && "shadow-lg hover:shadow-xl",
        intensity === "maximum" && "shadow-intense hover:shadow-2xl",

        // Zone-based left border accents
        zone === "strength" && "border-l-4 border-l-signal-red",
        zone === "endurance" && "border-l-4 border-l-zone-endurance",
        zone === "power" && "border-l-4 border-l-zone-power",
        zone === "warmup" && "border-l-4 border-l-zone-warmup",
        zone === "recovery" && "border-l-4 border-l-zone-recovery",

        className
      )}
    >
      {children}
    </Card>
  )
}

/**
 * ExerciseCardContent - Content wrapper for exercise cards
 * Provides consistent padding and spacing
 */
export function ExerciseCardContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <CardContent className={cn("p-3 sm:p-4", className)}>
      {children}
    </CardContent>
  )
}
