"use client"

import { useEffect } from "react"
import { programTemplateService } from "@/lib/services/program-template-service"

/**
 * Template Cache Warmer Component
 * 
 * This component warms the template cache on app startup for instant performance.
 * It runs in the background without blocking the UI.
 * 
 * Add this to your root layout or main page component.
 */
export function TemplateCacheWarmer() {
  useEffect(() => {
    // Warm cache in background (non-blocking)
    const warmCache = async () => {
      try {
        await programTemplateService.warmCache()
        console.log('[TemplateCacheWarmer] Cache warmed successfully')
      } catch (error) {
        console.warn('[TemplateCacheWarmer] Failed to warm cache (will work on demand):', error)
      }
    }

    warmCache()
  }, [])

  // This component renders nothing
  return null
}

