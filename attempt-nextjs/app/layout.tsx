import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import "@glideapps/glide-data-grid/dist/index.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "sonner"
import { UndoManager } from "@/components/UndoManager"
import { LanguageProvider } from "@/lib/language-context"
import { SettingsProvider } from "@/lib/settings-context"
import { VacationProvider } from "@/lib/vacation-context"
import { ErrorRecoveryInit } from "@/components/error-recovery-init"
import { DockNav } from "@/components/dock-nav"
import { ThemeWrapper } from "@/components/theme-wrapper"
import { MainContentWrapper } from "@/components/main-content-wrapper"

// import { GlobalSettings } from "@/components/global-settings"

// Load Geist font for variable font support
const geist = localFont({
  src: "../app/fonts/GeistVF.woff",
  variable: "--font-geist",
  display: "swap",
  weight: "100 900"
})

const geistMono = localFont({
  src: "../app/fonts/GeistMonoVF.woff", 
  variable: "--font-geist-mono",
  display: "swap",
  weight: "100 900"
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
      <body className={`${geist.variable} ${geistMono.variable} font-sans`} suppressHydrationWarning>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem 
          disableTransitionOnChange
          storageKey="theme-preference"
        >
          <ErrorRecoveryInit />
          <LanguageProvider>
            <SettingsProvider>
              <ThemeWrapper>
                <VacationProvider>
                  <div className="flex flex-col h-screen">
                    <div className="flex flex-1 overflow-hidden">
                      <SidebarProvider>
                        <AppSidebar />
                        <MainContentWrapper>
                          {children}
                        </MainContentWrapper>
                      </SidebarProvider>
                    </div>
                  </div>
                </VacationProvider>
                <UndoManager />
              </ThemeWrapper>
            </SettingsProvider>
          </LanguageProvider>
          <Toaster 
            position="bottom-right"
            gap={8}
            toastOptions={{
              className: 'sonner-toast',
              descriptionClassName: 'sonner-description',
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
              },
              classNames: {
                toast: 'sonner-toast group',
                title: 'sonner-title',
                description: 'sonner-description',
                actionButton: 'sonner-action',
                cancelButton: 'sonner-cancel',
                closeButton: 'sonner-close',
                error: 'sonner-error',
                success: 'sonner-success',
                warning: 'sonner-warning',
                info: 'sonner-info',
              },
            }}
          />
        </ThemeProvider>
        <div id="portal" />
      </body>
    </html>
  )
}
