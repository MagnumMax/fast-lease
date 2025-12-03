import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

const geistSans = localFont({
  src: [
    {
      path: "../public/fonts/InterVariable.ttf",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../public/fonts/InterVariable-Italic.ttf",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-geist-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Fast Lease Platform",
  description:
    "Платформа для лизинга автомобилей с интеграцией Supabase и современным дизайном.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={cn(
          geistSans.variable,
          "bg-background text-foreground min-h-screen font-sans antialiased",
        )}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
