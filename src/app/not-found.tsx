import type { Metadata } from "next";
import { StandalonePage } from "@/components/shell/standalone-page";
import { NotFoundState } from "@/components/states";

export const metadata: Metadata = { title: "Page not found · Dispatch Lite" };

export default function NotFound() {
  return (
    <StandalonePage>
      <NotFoundState />
    </StandalonePage>
  );
}
