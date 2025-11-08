import { create } from "zustand";
import { persist } from "zustand/middleware";
import { i18n } from "@/shared/libs/i18n";

// ============================================================================
// Settings Store
// ============================================================================

// Chat message limit constants
const DEFAULT_CHAT_MESSAGE_LIMIT = 20;

export type SettingsState = {
  // State
  theme: string;
  freeRoam: boolean;
  showDualCalendar: boolean;
  showToolCalls: boolean;
  chatMessageLimit: number;
  sendTypingIndicator: boolean;

  // Actions
  setTheme: (theme: string) => void;
  setFreeRoam: (freeRoam: boolean) => void;
  setShowDualCalendar: (show: boolean) => void;
  setShowToolCalls: (show: boolean) => void;
  setChatMessageLimit: (limit: number) => void;
  setSendTypingIndicator: (send: boolean) => void;
};

// Initialize settings with legacy migration support
function initializeSettings(): Partial<SettingsState> {
  if (typeof window === "undefined") {
    return {
      theme: "theme-default",
      freeRoam: false,
      showDualCalendar: false,
      showToolCalls: true,
      chatMessageLimit: 20,
      sendTypingIndicator: false,
    };
  }

  // Migrate legacy theme storage
  const storedStyleTheme = localStorage.getItem("styleTheme");
  const legacyTheme = localStorage.getItem("theme");
  let theme = "theme-default";
  if (storedStyleTheme) {
    theme = storedStyleTheme;
  } else if (legacyTheme?.startsWith("theme-")) {
    theme = legacyTheme;
    try {
      localStorage.setItem("styleTheme", legacyTheme);
    } catch {
      // localStorage.setItem failed - continue with legacy theme
    }
  }

  // Load other settings from localStorage
  const storedFreeRoam = localStorage.getItem("freeRoam");
  const storedDual = localStorage.getItem("showDualCalendar");
  const storedToolCalls = localStorage.getItem("showToolCalls");
  const storedLimit = localStorage.getItem("chatMessageLimit");
  const storedTyping = localStorage.getItem("sendTypingIndicator");

  return {
    theme,
    freeRoam: storedFreeRoam != null ? storedFreeRoam === "true" : false,
    showDualCalendar: storedDual != null ? storedDual === "true" : false,
    showToolCalls: storedToolCalls != null ? storedToolCalls === "true" : true,
    chatMessageLimit:
      storedLimit != null ? Number(storedLimit) : DEFAULT_CHAT_MESSAGE_LIMIT,
    sendTypingIndicator: storedTyping != null ? storedTyping === "true" : false,
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state with legacy migration
      ...(initializeSettings() as SettingsState),

      // Actions
      setTheme: (theme) => {
        set({ theme });
        // Persist to legacy key for backward compatibility
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("styleTheme", theme);
          } catch {
            // localStorage.setItem failed
          }
        }
      },
      setFreeRoam: (freeRoam) => {
        set({ freeRoam });
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("freeRoam", String(freeRoam));
          } catch {
            // localStorage.setItem failed
          }
        }
      },
      setShowDualCalendar: (show) => {
        set({ showDualCalendar: show });
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("showDualCalendar", String(show));
          } catch {
            // localStorage.setItem failed
          }
        }
      },
      setShowToolCalls: (show) => {
        set({ showToolCalls: show });
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("showToolCalls", String(show));
          } catch {
            // localStorage.setItem failed
          }
        }
      },
      setChatMessageLimit: (limit) => {
        set({ chatMessageLimit: limit });
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("chatMessageLimit", String(limit));
          } catch {
            // localStorage.setItem failed
          }
        }
      },
      setSendTypingIndicator: (send) => {
        set({ sendTypingIndicator: send });
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("sendTypingIndicator", String(send));
          } catch {
            // localStorage.setItem failed
          }
        }
      },
    }),
    {
      name: "settings-store",
      version: 1,
    }
  )
);

// ============================================================================
// Language Store
// ============================================================================

export type LanguageState = {
  // State
  locale: string;
  isLocalized: boolean;

  // Actions
  setLocale: (locale: string) => void;
  setUseLocalizedText: (useLocalized: boolean) => void;
};

// Initialize language with migration support
function initializeLanguage(): { locale: string; isLocalized: boolean } {
  if (typeof window === "undefined") {
    return { locale: "en", isLocalized: false };
  }

  // Check for stored locale
  const stored = localStorage.getItem("locale");
  if (stored) {
    return { locale: stored, isLocalized: stored !== "en" };
  }

  // Backward compatibility: migrate old isLocalized flag to locale
  const legacyIsLocalized = localStorage.getItem("isLocalized");
  if (legacyIsLocalized === "true") {
    return { locale: "ar", isLocalized: true };
  }

  return { locale: "en", isLocalized: false };
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => {
      const initial = initializeLanguage();

      // Initialize i18n and document lang attribute on store creation
      if (typeof window !== "undefined") {
        try {
          i18n.changeLanguage(initial.locale === "ar" ? "ar" : "en");
          document.documentElement.setAttribute(
            "lang",
            initial.locale === "ar" ? "ar" : "en"
          );
        } catch {
          // i18n not initialized yet, will be handled on first setLocale call
        }
      }

      return {
        // Initial state with migration
        locale: initial.locale,
        isLocalized: initial.isLocalized,

        // Actions
        setLocale: (locale) => {
          set({ locale, isLocalized: locale !== "en" });
          // Update i18n and document lang attribute
          if (typeof window !== "undefined") {
            try {
              i18n.changeLanguage(locale === "ar" ? "ar" : "en");
              document.documentElement.setAttribute(
                "lang",
                locale === "ar" ? "ar" : "en"
              );
              // Persist to localStorage for backward compatibility
              localStorage.setItem("locale", locale);
            } catch {
              // i18n or localStorage operations failed
            }
          }
        },
        setUseLocalizedText: (useLocalized) => {
          const state = get();
          let locale: string;
          if (useLocalized) {
            if (state.locale !== "en") {
              locale = state.locale;
            } else {
              locale = "ar";
            }
          } else {
            locale = "en";
          }
          set({ locale, isLocalized: useLocalized });
          // Update i18n and document lang attribute
          if (typeof window !== "undefined") {
            try {
              i18n.changeLanguage(locale === "ar" ? "ar" : "en");
              document.documentElement.setAttribute(
                "lang",
                locale === "ar" ? "ar" : "en"
              );
              // Persist to localStorage for backward compatibility
              localStorage.setItem("locale", locale);
            } catch {
              // i18n or localStorage operations failed
            }
          }
        },
      };
    },
    {
      name: "language-store",
      version: 1,
    }
  )
);

// ============================================================================
// UI Store
// ============================================================================

export type UIState = {
  // State
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  selectedTab: string;

  // Actions
  setSidebarOpen: (open: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setSelectedTab: (tab: string) => void;
};

export const useUIStore = create<UIState>()((set) => ({
  // Initial state
  sidebarOpen: true,
  mobileSidebarOpen: false,
  selectedTab: "chat",

  // Actions
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setSelectedTab: (tab) => set({ selectedTab: tab }),
}));
