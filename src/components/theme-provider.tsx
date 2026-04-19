"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Wraps next-themes so the rest of the app can import a single local symbol.
 *
 * Defaults:
 *   - attribute="class"   — toggles the `.dark` class on <html>
 *   - defaultTheme="system" — respect prefers-color-scheme on first visit
 *   - enableSystem        — listen for OS-level changes
 *   - disableTransitionOnChange — stop the fade-of-everything on theme flip
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
