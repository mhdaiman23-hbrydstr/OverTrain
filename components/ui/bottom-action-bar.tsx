"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface BottomActionBarProps {
  /** Left-side content (typically a back/cancel button or text) */
  leftContent?: ReactNode
  /** Center-aligned content for informational text */
  centerContent?: ReactNode
  /** Right-side action button(s) */
  rightContent: ReactNode
  /** Optional className for container */
  className?: string
  /** Whether to show fixed positioning (mobile/tablet vs inline desktop) */
  showFixed?: boolean
  /** Include spacing below for mobile bottom nav (64px) */
  includeMobileBottomNav?: boolean
}

/**
 * Reusable bottom action bar component for consistent button placement
 * Displays full-width buttons at bottom of screen/section
 *
 * Features:
 * - Mobile: Fixed at bottom, respects bottom navigation (64px)
 * - Desktop: Fixed at bottom, respects sidebar offset (left-64)
 * - Responsive button sizing and layout
 * - Automatically includes spacer to prevent content overlap
 *
 * Used in:
 * - Workout Logger (CompletionBar)
 * - Program Overview (TemplateDetailView)
 * - Program Wizard Steps (all steps)
 */
export function BottomActionBar({
  leftContent,
  centerContent,
  rightContent,
  className,
  showFixed = true,
  includeMobileBottomNav = false,
}: BottomActionBarProps) {
  const mobilePadding = includeMobileBottomNav
    ? "bottom-16"
    : "bottom-0"

  const actionContent = (
    <div className={cn(
      "w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4",
      className
    )}>
      {/* Left content - on mobile takes full width, on sm+ takes needed space */}
      <div className="flex-1 sm:flex-initial">
        {leftContent || <div />}
      </div>

      {centerContent && (
        <div className="flex-1 flex items-center justify-center">
          {centerContent}
        </div>
      )}

      {/* Right content - button takes full width on mobile, auto on sm+ */}
      <div className="w-full sm:flex-initial">
        {rightContent}
      </div>
    </div>
  )

  if (!showFixed) {
    // Inline version (for steps within content area)
    return (
      <div className="w-full">
        {actionContent}
        {/* Spacer for content below */}
        <div className="h-8 sm:h-0" />
      </div>
    )
  }

  // Fixed version (positioned at bottom)
  return (
    <>
      {/* Mobile & Tablet: Fixed bar above bottom navigation */}
      <div className={cn(
        "lg:hidden",
        "fixed",
        mobilePadding,
        "left-0 right-0",
        "bg-background border-t border-border",
        "p-4 z-[60] shadow-lg"
      )} style={!includeMobileBottomNav ? { paddingBottom: 'max(1rem, var(--safe-area-inset-bottom))' } : undefined}>
        {actionContent}
      </div>

      {/* Desktop: Positioned in main content area, respecting sidebar */}
      <div className={cn(
        "hidden lg:block",
        "fixed",
        "bottom-0 left-64 right-0",
        "bg-background border-t border-border",
        "p-4 shadow-lg z-50"
      )}>
        <div className="max-w-4xl mx-auto px-4">
          {actionContent}
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind fixed bars */}
      {/* Mobile: BottomActionBar (80px) + BottomNav (64px) = 144px */}
      {/* Desktop: BottomActionBar only (80px) */}
      <div className={cn(
        includeMobileBottomNav ? "h-36 lg:h-20" : "h-20 lg:h-20"
      )} />
    </>
  )
}
