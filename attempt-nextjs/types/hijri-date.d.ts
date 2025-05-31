declare module 'hijri-date' {
  // This module extends the global Date prototype and adds HijriDate to global scope
}

interface Date {
  toHijri(): HijriDate;
}

interface HijriDate {
  getFullYear(): number;
  getMonth(): number; // 1-indexed month (1-12)
  getDate(): number;
  toGregorian(): Date;
}

declare global {
  namespace globalThis {
    class HijriDate {
      constructor(year: number, month: number, day: number);
      toGregorian(): Date;
      getFullYear(): number;
      getMonth(): number; // 1-indexed month
      getDate(): number;
    }
  }
} 