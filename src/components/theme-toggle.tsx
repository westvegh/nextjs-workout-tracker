"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * Cycles light -> dark -> system on click. The icon mirrors the *current
 * resolved* look (moon in dark, sun in light) so the visual matches what the
 * user sees; `system` shows a monitor glyph to make the auto-state legible.
 *
 * Rendered nowhere until mounted: avoids the classic next-themes hydration
 * flash where server-rendered HTML has no theme class but the client does.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Classic next-themes hydration guard: server-rendered HTML has no theme
  // class on <html>, but next-themes sets one synchronously before hydration.
  // We render an icon-shaped placeholder until mount to avoid a flash + keep
  // the server/client trees structurally identical.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        className="h-9 w-9"
      >
        <Sun className="h-4 w-4 opacity-0" />
      </Button>
    );
  }

  function cycle() {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }

  const label =
    theme === "system"
      ? `System (${resolvedTheme ?? "auto"})`
      : theme === "dark"
        ? "Dark"
        : "Light";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={`Theme: ${label}. Click to change.`}
      title={label}
      className="h-9 w-9"
    >
      {theme === "system" ? (
        <Monitor className="h-4 w-4" />
      ) : resolvedTheme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}
