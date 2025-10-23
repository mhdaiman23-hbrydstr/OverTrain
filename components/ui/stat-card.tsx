"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface StatCardProps {
  icon?: ReactNode
  value: string | number
  label: string
  variant?: "default" | "gradient" | "accent"
  accentColor?: "primary" | "success" | "warning" | "error"
  size?: "sm" | "md" | "lg"
  className?: string
}

/**
 * StatCard - Specialized card for displaying metrics with icon + value + label
 *
 * Perfect for:
 * - Displaying key metrics (total workouts, volume, strength gains)
 * - Analytics dashboards
 * - Quick stat overview panels
 *
 * Variants:
 * - default: Clean white background
 * - gradient: Subtle gradient background
 * - accent: Colored background matching theme
 *
 * Sizes:
 * - sm: Compact (p-4) - for small screens
 * - md: Standard (p-6) - for most use cases
 * - lg: Spacious (p-8) - for featured metrics
 *
 * Example:
 * ```tsx
 * <StatCard
 *   icon={<Dumbbell className="h-8 w-8" />}
 *   value="127"
 *   label="Total Sets"
 *   variant="gradient"
 *   size="md"
 * />
 * ```
 */
export function StatCard({
  icon,
  value,
  label,
  variant = "default",
  accentColor = "primary",
  size = "md",
  className,
}: StatCardProps) {
  const sizeClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  }

  const iconSizeClasses = {
    sm: "h-6 w-6 mb-1",
    md: "h-8 w-8 mb-2",
    lg: "h-10 w-10 mb-3",
  }

  const valueSizeClasses = {
    sm: "text-lg font-bold",
    md: "text-2xl font-bold",
    lg: "text-3xl font-bold",
  }

  const labelSizeClasses = {
    sm: "text-xs text-muted-foreground",
    md: "text-sm text-muted-foreground",
    lg: "text-base text-muted-foreground",
  }

  const variantClasses = {
    default: "",
    gradient: "bg-gradient-to-br from-card to-muted/30",
    accent: cn(
      "bg-opacity-5 border-opacity-20",
      accentColor === "primary" && "bg-primary/5 border-primary/20",
      accentColor === "success" && "bg-green-500/5 border-green-500/20",
      accentColor === "warning" && "bg-yellow-500/5 border-yellow-500/20",
      accentColor === "error" && "bg-red-500/5 border-red-500/20"
    ),
  }

  return (
    <Card className={cn(variantClasses[variant], className)}>
      <CardContent className={cn(sizeClasses[size], "text-center")}>
        {icon && (
          <div className={cn("text-primary mx-auto", iconSizeClasses[size])}>
            {icon}
          </div>
        )}
        <div className={valueSizeClasses[size]}>{value}</div>
        <div className={labelSizeClasses[size]}>{label}</div>
      </CardContent>
    </Card>
  )
}
