import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { cn } from "@/components/ui/utils";
import { env } from "@/env";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

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
    <html lang="en" className={cn("h-full font-sans antialiased", geist.variable)}>
      <body className="min-h-full bg-background text-foreground">
        <Providers timeZone={env.APP_TIMEZONE}>{children}</Providers>
      </body>
    </html>
  );
}
