'use client'

import * as React from 'react'
import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip'

/**
 * MobileTooltip - Touch-aware tooltip wrapper
 *
 * Solves the problem: Radix UI Tooltip only responds to hover, which doesn't exist on touch devices
 *
 * Solution: Detects device capabilities at runtime and switches between:
 * - HOVER devices (desktop): Default Radix behavior (hover-based)
 * - TOUCH devices (mobile/tablet): Click-to-toggle behavior
 *
 * The detection uses window.matchMedia('(hover: hover)') which is the CSS specification
 * for detecting actual pointer hover capability (not just touch support).
 */
interface MobileTooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
  align?: 'center' | 'start' | 'end'
  sideOffset?: number
}

export function MobileTooltip({
  children,
  content,
  side = 'bottom',
  className,
  align = 'center',
  sideOffset = 6,
}: MobileTooltipProps) {
  // Track device capabilities
  const [deviceType, setDeviceType] = React.useState<'hover' | 'touch' | null>(null)
  const [open, setOpen] = React.useState(false)

  /**
   * Device detection: Run once on component mount
   * Using (hover: hover) media query which is more reliable than checking for touch
   * - Returns true: Device has hover capability (mouse, trackpad)
   * - Returns false: Device doesn't have hover (pure touch devices)
   * This handles hybrid devices (tablet with keyboard) correctly
   */
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover)')
    const update = () => setDeviceType(mediaQuery.matches ? 'hover' : 'touch')

    update()
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', update)
      return () => mediaQuery.removeEventListener('change', update)
    }

    mediaQuery.addListener(update)
    return () => mediaQuery.removeListener(update)
  }, [])

  /**
   * Click handler for touch devices
   * Toggles the tooltip open/closed state
   * stopPropagation prevents parent click handlers from interfering
   */
  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen((prev) => !prev)
  }

  /**
   * Keyboard handler: Allow Escape key to close tooltip
   * Important for accessibility - users expect Escape to close overlays
   * Radix UI's Tooltip doesn't handle this automatically when in controlled mode
   */
  React.useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  /**
   * During device detection (initial mount), render safe fallback
   * This prevents flicker between hover and touch modes
   */
  if (deviceType === null) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align} sideOffset={sideOffset} className={className}>
          {content}
        </TooltipContent>
      </Tooltip>
    )
  }

  /**
   * TOUCH DEVICE MODE
   * Uses click-to-toggle behavior
   * - Click trigger → tooltip opens
   * - Click trigger again → tooltip closes
   * - Click outside → tooltip closes (Radix UI handles this)
   * - Escape key → tooltip closes (our handler above)
   *
   * CRITICAL: Do NOT use <TooltipTrigger asChild> on touch devices
   * Using asChild + span wrapper causes Radix UI event conflicts
   * Instead, the div wrapper IS the trigger (no TooltipTrigger)
   * This gives us direct control over click/touch events
   *
   * Event handling:
   * - onClick: Handles click events (primary for mouse/touch simulation)
   * - onTouchEnd: Secondary handler for real touch devices
   * - touchAction: 'manipulation' prevents double-tap zoom delay
   */
  if (deviceType === 'touch') {
    return (
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <span
            onClick={handleTriggerClick}
            onTouchEnd={handleTriggerClick}
            aria-expanded={open}
            role="button"
            tabIndex={0}
            className="inline-flex cursor-pointer"
            style={{ touchAction: 'manipulation' }}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} align={align} sideOffset={sideOffset} className={className}>
          {content}
        </TooltipContent>
      </Tooltip>
    )
  }

  /**
   * HOVER DEVICE MODE (Desktop)
   * Uses Radix UI's default hover behavior
   * No state management needed - Radix UI handles everything
   */
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} sideOffset={sideOffset} className={className}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
