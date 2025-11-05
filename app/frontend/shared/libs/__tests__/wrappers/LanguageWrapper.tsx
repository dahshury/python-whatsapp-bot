import type React from "react";
import { LanguageProvider } from "@/shared/libs/state/language-context";

const LanguageWrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

export default LanguageWrapper;
