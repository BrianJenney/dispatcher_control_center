import type { Page } from "@playwright/test";

export type FlowContext = {
  page: Page;
  number: (query: string, params?: unknown[]) => Promise<number>;
  text: (query: string, params?: unknown[]) => Promise<string | null>;
  execute: (query: string, params?: unknown[]) => Promise<void>;
};

export type FlowStep = { name: string; run: (context: FlowContext) => Promise<void> };

export const phoneWidth = 640;

export type Flow = { route: string; startsSignedIn: boolean; steps: FlowStep[] };
