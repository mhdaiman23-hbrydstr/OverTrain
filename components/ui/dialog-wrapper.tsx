"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface DialogWrapperProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  size?: "compact" | "default" | "medium" | "large" | "fullscreen"
  children: ReactNode
  footer?: ReactNode
  showHeader?: boolean
  headerClassName?: string
  contentClassName?: string
}

/**
 * DialogWrapper - Standardized dialog component with size variants
 *
 * Sizes:
 * - compact: max-w-md (perfect for confirmations, quick actions)
 * - default: max-w-lg (standard dialogs, forms)
 * - medium: max-w-2xl (complex forms, detailed views)
 * - large: max-w-4xl (analytics, comprehensive views)
 * - fullscreen: max-w-[95vw] h-[90vh] (mobile-first experiences)
 *
 * Example:
 * ```tsx
 * <DialogWrapper
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Delete Exercise?"
 *   size="compact"
 * >
 *   <p>This action cannot be undone.</p>
 * </DialogWrapper>
 * ```
 */
export function DialogWrapper({
  open,
  onOpenChange,
  title,
  description,
  size = "default",
  children,
  footer,
  showHeader = true,
  headerClassName,
  contentClassName,
}: DialogWrapperProps) {
  const sizeClasses = {
    compact: "max-w-md mx-4",
    default: "max-w-lg mx-4",
    medium: "max-w-2xl mx-4",
    large: "max-w-4xl mx-4",
    fullscreen: "max-w-[95vw] md:max-w-full h-[90vh] md:h-auto mx-4 md:mx-0",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "border-2 bg-card-gradient w-[95vw] md:w-full",
          sizeClasses[size],
          contentClassName
        )}
      >
        {showHeader && (title || description) && (
          <DialogHeader className={headerClassName}>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}

        <div className="flex-1 min-h-0">
          {children}
        </div>

        {footer && (
          <DialogFooter className="flex-col space-y-2 pt-4">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
