import type { Page } from "@playwright/test";

export type FlowContext = {
  page: Page;
  number: (query: string, params?: unknown[]) => Promise<number>;
};

export type FlowStep = { name: string; run: (context: FlowContext) => Promise<void> };

export type Flow = { route: string; startsSignedIn: boolean; steps: FlowStep[] };
