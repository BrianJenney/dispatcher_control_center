"use client";

import "./globals.css";
import { geist } from "@/app/fonts";
import { StandalonePage } from "@/components/shell/standalone-page";
import { ErrorState } from "@/components/states";
import { useTheme } from "@/components/theme";
import { cn } from "@/components/ui/utils";

export default function GlobalError() {
  const theme = useTheme();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full font-sans antialiased", geist.variable, theme === "dark" && "dark")}
    >
      <body className="min-h-full bg-background text-foreground">
        <title>Something went wrong · Dispatch Lite</title>
        <StandalonePage>
          <ErrorState
            pageTitle
            description="Dispatch Lite could not load. Your data is safe."
            onRetry={() => {
              window.location.reload();
            }}
          />
        </StandalonePage>
      </body>
    </html>
  );
}
