"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface AccentCardProps {
  variant: "info" | "success" | "warning" | "error"
  icon?: ReactNode
  title?: string
  description?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
  compact?: boolean
}

/**
 * AccentCard - Specialized card with colored background and border
 *
 * Perfect for:
 * - Alert/notification cards
 * - Status indicators
 * - Success/error messages
 * - Informational panels
 * - Help/tip sections
 *
 * Variants:
 * - info: Blue accent (informational)
 * - success: Green accent (positive/completed)
 * - warning: Orange accent (caution/attention)
 * - error: Red accent (error/destructive)
 *
 * Example:
 * ```tsx
 * <AccentCard
 *   variant="success"
 *   icon={<CheckCircle className="h-5 w-5" />}
 *   title="Great job!"
 *   description="You've completed your weekly goal"
 * />
 * ```
 */
export function AccentCard({
  variant,
  icon,
  title,
  description,
  children,
  action,
  className,
  compact = false,
}: AccentCardProps) {
  const variantClasses = {
    info: "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20",
    success: "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20",
    warning: "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20",
    error: "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20",
  }

  const iconColorClasses = {
    info: "text-blue-600 dark:text-blue-400",
    success: "text-green-600 dark:text-green-400",
    warning: "text-orange-600 dark:text-orange-400",
    error: "text-red-600 dark:text-red-400",
  }

  const textColorClasses = {
    info: "text-blue-900 dark:text-blue-100",
    success: "text-green-900 dark:text-green-100",
    warning: "text-orange-900 dark:text-orange-100",
    error: "text-red-900 dark:text-red-100",
  }

  const descriptionColorClasses = {
    info: "text-blue-700 dark:text-blue-200",
    success: "text-green-700 dark:text-green-200",
    warning: "text-orange-700 dark:text-orange-200",
    error: "text-red-700 dark:text-red-200",
  }

  return (
    <Card
      className={cn(
        "border-2 transition-colors",
        variantClasses[variant],
        className
      )}
    >
      <div className={cn(
        "flex gap-3 items-start",
        compact ? "p-3" : "p-4"
      )}>
        {icon && (
          <div className={cn(
            "flex-shrink-0 flex items-center justify-center",
            compact ? "h-5 w-5" : "h-6 w-6",
            iconColorClasses[variant]
          )}>
            {icon}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={cn(
              "font-semibold",
              compact ? "text-sm" : "text-base",
              textColorClasses[variant]
            )}>
              {title}
            </h3>
          )}

          {description && (
            <p className={cn(
              "mt-1",
              compact ? "text-xs" : "text-sm",
              descriptionColorClasses[variant]
            )}>
              {description}
            </p>
          )}

          {children && (
            <div className={cn(
              descriptionColorClasses[variant],
              compact ? "text-xs" : "text-sm",
              description ? "mt-2" : "mt-1"
            )}>
              {children}
            </div>
          )}
        </div>

        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </Card>
  )
}
