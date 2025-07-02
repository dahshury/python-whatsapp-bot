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
import { CustomerDataProvider } from "@/lib/customer-data-context"
import { UnifiedDataProvider } from "@/lib/unified-data-provider"
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
  title: "WhatsApp Bot Dashboard",
  description: "Real-time dashboard for WhatsApp bot management",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Global console error suppression for React Timekeeper issues
              (function() {
                if (typeof window !== 'undefined') {
                  const originalError = console.error;
                  const originalWarn = console.warn;
                  
                  console.error = function(...args) {
                    const message = args[0]?.toString() || '';
                    // Suppress React Timekeeper specific errors
                    if (
                      message.includes('Got NaN while animating') ||
                      message.includes('SpringValue') ||
                      message.includes('non-passive event listener') ||
                      message.includes('useClockEvents') ||
                      message.includes('touchstart') ||
                      message.includes('Avoid using document.write') ||
                      message.includes('Download the React DevTools') ||
                      message.includes('listener indicated an asynchronous response')
                    ) {
                      return; // Suppress these specific errors
                    }
                    originalError.apply(console, args);
                  };
                  
                  console.warn = function(...args) {
                    const message = args[0]?.toString() || '';
                    // Suppress React Timekeeper specific warnings
                    if (
                      message.includes('non-passive event listener') ||
                      message.includes('touchstart') ||
                      message.includes('useClockEvents') ||
                      message.includes('Got NaN while animating') ||
                      message.includes('SpringValue') ||
                      message.includes('Avoid using document.write')
                    ) {
                      return; // Suppress these specific warnings
                    }
                    originalWarn.apply(console, args);
                  };
                }
              })();
            `,
          }}
        />
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
              <UnifiedDataProvider>
                <ThemeWrapper>
                  <VacationProvider>
                    <CustomerDataProvider>
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
                    </CustomerDataProvider>
                  </VacationProvider>
                  <UndoManager />
                </ThemeWrapper>
              </UnifiedDataProvider>
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
