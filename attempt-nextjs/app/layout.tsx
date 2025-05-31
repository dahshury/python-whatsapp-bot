import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "@/components/ui/toaster"
import { LanguageProvider } from "@/lib/language-context"
import { SettingsProvider } from "@/lib/settings-context"
import { ErrorRecoveryInit } from "@/components/error-recovery-init"

// Import GlobalSettings normally for now since layout is a server component
import { GlobalSettings } from "@/components/global-settings"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
})

export const metadata: Metadata = {
  title: "Reservation Management System",
  description: "Comprehensive reservation management with FullCalendar integration",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Font optimization */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} font-sans`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ErrorRecoveryInit />
          <LanguageProvider>
            <SettingsProvider>
              <SidebarProvider>
                <AppSidebar />
                <main className="flex-1 relative">
                  {children}
                  <GlobalSettings />
                </main>
              </SidebarProvider>
            </SettingsProvider>
          </LanguageProvider>
          <Toaster />
        </ThemeProvider>
        <div id="portal" style={{ position: 'fixed', left: 0, top: 0, zIndex: 9999 }} />
      </body>
    </html>
  )
}
