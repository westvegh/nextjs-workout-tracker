import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { PostHogProvider } from "@/components/posthog-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { PageTransition } from "@/components/page-transition";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Next.js Workout Tracker",
  description:
    "A production-grade workout tracker starter built on Next.js, Supabase, and exerciseapi.dev.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // suppressHydrationWarning is required by next-themes: the provider
      // writes the class on <html> before React hydrates.
      suppressHydrationWarning
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <PostHogProvider>
            <Nav />
            <PageTransition>{children}</PageTransition>
            <Footer />
            <Toaster
              position="bottom-right"
              richColors
              closeButton
              toastOptions={{
                // Respect theme via CSS vars so toasts match the palette in
                // both modes without needing to re-read next-themes here.
                style: {
                  background: "var(--card)",
                  color: "var(--card-foreground)",
                  border: "1px solid var(--border)",
                },
              }}
            />
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
