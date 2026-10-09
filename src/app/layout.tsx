import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cormorant, geist } from "@/app/fonts";
import { Providers } from "@/app/providers";
import { themeBootScript } from "@/components/theme-script";
import { cn } from "@/components/ui/utils";
import { env } from "@/env";

export const metadata: Metadata = {
  title: "Dispatch Lite",
  description: "Dispatcher operations for a luxury car service",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("h-full font-sans antialiased", geist.variable, cormorant.variable)}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <Providers timeZone={env.APP_TIMEZONE}>{children}</Providers>
      </body>
    </html>
  );
}
