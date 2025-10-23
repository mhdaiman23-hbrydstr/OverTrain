"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface DetailCardProps {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
  footer?: ReactNode
  variant?: "default" | "highlighted" | "minimal"
  size?: "sm" | "md" | "lg"
  className?: string
  headerClassName?: string
  contentClassName?: string
}

/**
 * DetailCard - Specialized card for displaying detailed information with header + content
 *
 * Perfect for:
 * - Profile information sections
 * - Analytics with explanations
 * - Detailed data displays with metadata
 * - Form sections within cards
 *
 * Variants:
 * - default: Standard card with clear separation
 * - highlighted: Accent border and subtle background
 * - minimal: No header styling, just title + content
 *
 * Sizes:
 * - sm: Compact (p-4)
 * - md: Standard (p-6)
 * - lg: Spacious (p-8)
 *
 * Example:
 * ```tsx
 * <DetailCard
 *   title="Weekly Progress"
 *   description="Your workout frequency over the past 8 weeks"
 *   variant="default"
 *   size="md"
 * >
 *   <div className="space-y-4">
 *     Content here
 *   </div>
 * </DetailCard>
 * ```
 */
export function DetailCard({
  title,
  description,
  children,
  action,
  footer,
  variant = "default",
  size = "md",
  className,
  headerClassName,
  contentClassName,
}: DetailCardProps) {
  const sizeClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  }

  const titleSizeClasses = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  }

  const descriptionSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  const variantClasses = {
    default: "",
    highlighted: "border-primary/30 bg-primary/5",
    minimal: "",
  }

  return (
    <Card className={cn(variantClasses[variant], className)}>
      {(title || description || action) && (
        <CardHeader
          className={cn(
            variant === "minimal" && "pb-3",
            headerClassName
          )}
        >
          <div className={cn(
            "flex items-start justify-between gap-4",
            variant === "minimal" && "gap-2"
          )}>
            <div className="flex-1 space-y-1">
              {title && (
                <CardTitle className={titleSizeClasses[size]}>
                  {title}
                </CardTitle>
              )}
              {description && (
                <CardDescription className={descriptionSizeClasses[size]}>
                  {description}
                </CardDescription>
              )}
            </div>
            {action && (
              <div className="flex-shrink-0">
                {action}
              </div>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent
        className={cn(
          sizeClasses[size],
          "space-y-4",
          contentClassName
        )}
      >
        {children}
      </CardContent>

      {footer && (
        <div className={cn(
          "border-t border-border/50",
          sizeClasses[size],
          "space-y-3"
        )}>
          {footer}
        </div>
      )}
    </Card>
  )
}
