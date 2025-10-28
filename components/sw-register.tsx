"use client"

import { useEffect } from "react"

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Only register in browser environment
    if (typeof window === "undefined") return

    // Check if service workers are supported
    if (!("serviceWorker" in navigator)) {
      console.log("[PWA] Service Workers are not supported in this browser")
      return
    }

    // Register the service worker
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })

        console.log("[PWA] Service Worker registered successfully", registration)

        // Check for updates periodically
        setInterval(() => {
          registration.update().catch((error) => {
            console.error("[PWA] Error checking for Service Worker updates:", error)
          })
        }, 60 * 60 * 1000) // Check every hour

        // Listen for new service worker
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          if (!newWorker) return

          console.log("[PWA] New Service Worker installing...")

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New service worker is ready
              console.log("[PWA] New Service Worker ready, showing update prompt")

              // Notify user about the update
              const message = document.createElement("div")
              message.className =
                "fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-primary text-primary-foreground rounded-lg p-4 shadow-lg z-50"
              message.innerHTML = `
                <p class="text-sm font-medium mb-3">OverTrain app updated</p>
                <button id="update-btn" class="text-xs bg-white text-primary px-3 py-1 rounded font-medium">Refresh</button>
              `

              document.body.appendChild(message)

              const button = document.getElementById("update-btn")
              if (button) {
                button.addEventListener("click", () => {
                  newWorker.postMessage({ type: "SKIP_WAITING" })
                  window.location.reload()
                })
              }

              // Auto-refresh after 10 seconds if user doesn't click
              setTimeout(() => {
                newWorker.postMessage({ type: "SKIP_WAITING" })
                window.location.reload()
              }, 10000)
            }
          })
        })
      } catch (error) {
        console.error("[PWA] Error registering Service Worker:", error)
      }
    })

    // Handle controller change
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("[PWA] Service Worker controller changed")
    })
  }, [])

  return null
}
