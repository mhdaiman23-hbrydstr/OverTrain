/**
 * PWA Environment Detection Utilities
 * Detect runtime environment (browser, webview, installed app, capacitor)
 */

export const PWADetection = {
  /**
   * Check if running in standalone mode (installed PWA)
   */
  isStandalone(): boolean {
    // Check if launched as standalone (PWA or Capacitor)
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes("android-app://")
    )
  },

  /**
   * Check if running in Capacitor/native wrapper
   */
  isCapacitor(): boolean {
    // Capacitor sets window.Capacitor
    return typeof (window as any).Capacitor !== "undefined"
  },

  /**
   * Check if running in WebView (embedded in native app)
   */
  isWebView(): boolean {
    const ua = navigator.userAgent.toLowerCase()
    const isAndroidWebView =
      ua.includes("wv") && ua.includes("android") && !ua.includes("chrome")
    const isIOSWebView = ua.includes("crios") || ua.includes("safari")
    // More specific: check for webview indicators
    return (
      isAndroidWebView ||
      typeof (window as any).android !== "undefined" ||
      typeof (window as any).webkit !== "undefined"
    )
  },

  /**
   * Check if iOS device
   */
  isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
  },

  /**
   * Check if Android device
   */
  isAndroid(): boolean {
    return /Android/.test(navigator.userAgent)
  },

  /**
   * Check if mobile/tablet device
   */
  isMobile(): boolean {
    return this.isIOS() || this.isAndroid()
  },

  /**
   * Get current environment name
   */
  getEnvironment(): "native" | "webview" | "standalone" | "browser" {
    if (this.isCapacitor() || this.isStandalone()) {
      return "standalone"
    }
    if (this.isWebView()) {
      return "webview"
    }
    return "browser"
  },

  /**
   * Check if PWA install prompt should be shown
   * Returns false if:
   * - In webview (beforeinstallprompt won't fire anyway)
   * - In Capacitor (app is already installed)
   * - In standalone mode (already installed as app)
   */
  shouldShowInstallPrompt(): boolean {
    const env = this.getEnvironment()
    // Only show in browser environment
    return env === "browser"
  },

  /**
   * Get user-friendly environment description
   */
  getEnvironmentDescription(): string {
    const env = this.getEnvironment()
    const isMobile = this.isMobile()

    switch (env) {
      case "native":
      case "standalone":
        return `App (${isMobile ? "Mobile" : "Desktop"})`
      case "webview":
        return `WebView (${isMobile ? "Mobile" : "Desktop"})`
      case "browser":
        return `Browser (${isMobile ? "Mobile" : "Desktop"})`
      default:
        return "Unknown"
    }
  },
}
