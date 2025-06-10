import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "sonner"
import { UndoManager } from "@/components/UndoManager"
import { LanguageProvider } from "@/lib/language-context"
import { SettingsProvider } from "@/lib/settings-context"
import { VacationProvider } from "@/lib/vacation-context"
import { ErrorRecoveryInit } from "@/components/error-recovery-init"
import { TopNav } from "@/components/top-nav"

// import { GlobalSettings } from "@/components/global-settings"

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
              <VacationProvider>
                <div className="flex flex-col h-screen">
                  <header className="border-b flex justify-center">
                    <TopNav />
                  </header>
                  <div className="flex flex-1 overflow-hidden">
                    <SidebarProvider>
                      <AppSidebar />
                      <main className="flex-1 relative overflow-y-auto">
                        {children}
                      </main>
                    </SidebarProvider>
                  </div>
                </div>
              </VacationProvider>
              <UndoManager />
            </SettingsProvider>
          </LanguageProvider>
          <Toaster />
        </ThemeProvider>
        <div id="portal" style={{ position: 'fixed', left: 0, top: 0, zIndex: 9999 }} />
      </body>
    </html>
  )
}
