import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/lib/toast-config";
import { GlobalCommandPalette } from "@/components/global-command-palette";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ROCQET - The GitHub for AI Prompts",
  description: "Enterprise-grade prompt management with version control, real-time collaboration, and powerful AI features",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Apply theme before React hydration to prevent flicker
              (function() {
                const theme = localStorage.getItem('theme') || 'light';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                // Prevent system theme preference from overriding
                document.documentElement.style.colorScheme = theme;
              })();
            `,
          }}
        />
        <QueryProvider>
          {children}
          <Toaster />
          <GlobalCommandPalette />
        </QueryProvider>
      </body>
    </html>
  );
}
