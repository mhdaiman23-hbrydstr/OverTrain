import type React from "react"
import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import { Suspense } from "react"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"
import { TemplateCacheWarmer } from "@/components/template-cache-warmer"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { ServiceWorkerRegister } from "@/components/sw-register"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "OverTrain: Go One More - Your Personal Fitness Tracker",
  description: "Track workouts, build programs, and achieve your fitness goals with OverTrain",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OverTrain",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
    other: [
      {
        rel: "apple-touch-icon",
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "192x192",
        url: "/icons/icon-192x192.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "512x512",
        url: "/icons/icon-512x512.png",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://overtrain.app",
    title: "OverTrain: Go One More - Your Personal Fitness Tracker",
    description: "Track workouts, build programs, and achieve your fitness goals",
    siteName: "OverTrain",
  },
  twitter: {
    card: "summary_large_image",
    title: "OverTrain: Go One More - Your Personal Fitness Tracker",
    description: "Track workouts, build programs, and achieve your fitness goals",
  },
}

// Ensure proper viewport sizing and safe-area handling on iOS
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              <TemplateCacheWarmer />
              <ServiceWorkerRegister />
              <Suspense fallback={null}>{children}</Suspense>
              <Toaster />
              <PWAInstallPrompt />
            </TooltipProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
