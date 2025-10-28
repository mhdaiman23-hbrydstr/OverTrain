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
}

export function MobileTooltip({
  children,
  content,
  side = 'bottom',
  className,
}: MobileTooltipProps) {
  // Track device capabilities
  const [deviceType, setDeviceType] = React.useState<'hover' | 'touch' | null>(null)
  const [open, setOpen] = React.useState(false)

  /**
   * Device detection: Run once on component mount
   * Uses multiple heuristics because single checks can fail:
   * 1. window.matchMedia('(hover: hover)') - Primary: Does device support hover?
   * 2. window.matchMedia('(pointer: coarse)') - Secondary: Is pointer coarse (touch)?
   * 3. Touch events in navigator - Fallback: Has touch support in API?
   *
   * This combination handles:
   * - Real mobile/tablet devices: coarse pointer
   * - DevTools mobile simulation: may need touch API check
   * - Hybrid devices: will respect actual hover capability
   */
  React.useEffect(() => {
    const supportsHover = window.matchMedia('(hover: hover)').matches
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches
    const hasTouchSupport = typeof navigator !== 'undefined' && 'ontouchstart' in window

    // Device is touch if:
    // - It has no hover support, OR
    // - It has a coarse pointer (typical for touch), OR
    // - It has touch event support (real or simulated)
    const isTouch = !supportsHover || hasCoarsePointer || hasTouchSupport

    setDeviceType(isTouch ? 'touch' : 'hover')
  }, [])

  /**
   * Click/Touch handler for touch devices
   * Toggles the tooltip open/closed state
   * stopPropagation prevents parent click handlers from interfering
   *
   * Handles both MouseEvent (onClick) and TouchEvent (onTouchEnd)
   * on mobile devices to ensure clicks work reliably
   */
  const handleTriggerClick = (e: React.MouseEvent | React.TouchEvent) => {
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
        <TooltipContent side={side} className={className}>
          {content}
        </TooltipContent>
      </Tooltip>
    )
  }

  /**
   * TOUCH DEVICE MODE
   * Uses click-to-toggle behavior with both click and touch events
   * - Touch/click trigger → tooltip opens
   * - Touch/click trigger again → tooltip closes
   * - Click outside → tooltip closes (Radix UI handles this)
   * - Escape key → tooltip closes (our handler above)
   *
   * Event handling:
   * - onClick: Handles click events (primary for mouse/touch simulation)
   * - onTouchEnd: Secondary handler for real touch devices (fires when finger lifted)
   * - touchAction: 'manipulation' tells browser not to delay for double-tap
   *
   * aria-expanded: Accessibility - tells screen readers the expanded state
   * onOpenChange: Called when tooltip needs to close (outside click, escape key)
   * controlled open prop: We fully control the tooltip state
   *
   * NOTE: We use a div wrapper (NOT asChild) to ensure click/touch handlers work correctly.
   * Using asChild causes conflicts with Radix UI's trigger mechanism and controlled state.
   */
  if (deviceType === 'touch') {
    return (
      <Tooltip open={open} onOpenChange={setOpen}>
        <div
          onClick={handleTriggerClick}
          onTouchEnd={handleTriggerClick}
          aria-expanded={open}
          role="button"
          tabIndex={0}
          className="inline-flex cursor-pointer"
          style={{ touchAction: 'manipulation' }}
        >
          {children}
        </div>
        <TooltipContent side={side} className={className}>
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
      <TooltipContent side={side} className={className}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
