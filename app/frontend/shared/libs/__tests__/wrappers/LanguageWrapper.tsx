import type React from "react";
import { StoreProvider } from "@/infrastructure/providers/store-provider";

const LanguageWrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
  <StoreProvider>{children}</StoreProvider>
);

export default LanguageWrapper;
