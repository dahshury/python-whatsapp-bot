"use client";

import { i18n } from "@shared/libs/i18n";
import { Button } from "@ui/button";
import { useEffect, useState } from "react";
import { useLanguageStore } from "@/infrastructure/store/app-store";
import { Card, CardContent } from "@/shared/ui/card";
import { useEnhancedDashboardController } from "../services/enhanced-dashboard-controller";
import { DashboardHeader } from "../ui/DashboardHeader";
import { DashboardTabButtons, DashboardTabs } from "../ui/DashboardTabs";

export function EnhancedDashboardView() {
  const { isLocalized: storeIsLocalized, locale } = useLanguageStore();
  const controller = useEnhancedDashboardController({ locale });

  // Track if component is mounted to prevent hydration mismatch
  // During SSR, use default English values; after hydration, use localized values
  const [mounted, setMounted] = useState(false);
  const isLocalized = mounted ? storeIsLocalized : false;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (controller.error) {
    return (
      <div className="flex min-h-[25rem] items-center justify-center">
        <Card className="w-full max-w-md border-destructive/40 bg-destructive/5 shadow-2xl shadow-destructive/10">
          <CardContent className="p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <svg
                  aria-label="Error icon"
                  className="h-7 w-7"
                  fill="none"
                  role="img"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <title>Error icon</title>
                  <path
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
            </div>
            <h3 className="mb-2 font-semibold text-lg">
              {i18n.getMessage("dashboard_error_title", isLocalized)}
            </h3>
            <p className="mb-5 text-muted-foreground">{controller.error}</p>
            <Button
              className="font-semibold"
              onClick={() => controller.refreshDashboard()}
              variant="outline"
            >
              {i18n.getMessage("dashboard_try_again", isLocalized)}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative isolate overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-background via-background/80 to-background/40 p-6 shadow-lg shadow-primary/5 sm:p-10">
        <div
          aria-hidden="true"
          className="-top-24 pointer-events-none absolute inset-x-0 h-52 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-3xl"
        />
        <div className="-right-10 pointer-events-none absolute bottom-0 h-64 w-64 rounded-full bg-chart-2/20 blur-3xl" />
        <div className="-left-10 pointer-events-none absolute top-16 h-64 w-64 rounded-full bg-chart-4/20 blur-3xl" />
        <div className="relative space-y-6">
          <DashboardHeader
            daysCount={controller.daysCount}
            filters={controller.filters}
            isLocalized={isLocalized}
            isUsingMockData={controller.isUsingMockData}
            onDateRangeChange={controller.handleDateRangeChange}
            onExport={controller.handleExport}
          />
          <DashboardTabButtons
            controller={controller}
            isLocalized={isLocalized}
          />
          <DashboardTabs controller={controller} isLocalized={isLocalized} />
        </div>
      </section>
    </div>
  );
}
