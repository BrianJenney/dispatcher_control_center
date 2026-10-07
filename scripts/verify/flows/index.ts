import { dashboard } from "./dashboard";
import { health } from "./health";
import { login } from "./login";
import { schedule } from "./schedule";
import { status } from "./status";
import type { Flow } from "./types";

export type { Flow, FlowContext, FlowStep } from "./types";

export const flows: Record<string, Flow> = { login, dashboard, status, schedule, health };
