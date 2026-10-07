import { activity } from "./activity";
import { assign } from "./assign";
import { dashboard } from "./dashboard";
import { health } from "./health";
import { insights } from "./insights";
import { jobsCancel, jobsCreate, jobsEdit, jobsSearch } from "./jobs";
import { login } from "./login";
import { documents, drivers, fleet } from "./people";
import { schedule } from "./schedule";
import { status } from "./status";
import type { Flow } from "./types";

import { expectNoSidewaysScroll } from "./expected";
import { phoneWidth, type FlowContext, type FlowStep } from "./types";

export type { Flow, FlowContext, FlowStep } from "./types";

export async function runStep(step: FlowStep, context: FlowContext) {
  await step.run(context);
  if ((context.page.viewportSize()?.width ?? phoneWidth) < phoneWidth) await expectNoSidewaysScroll(context.page);
}

export const flows: Record<string, Flow> = {
  login,
  dashboard,
  "jobs-create": jobsCreate,
  "jobs-edit": jobsEdit,
  "jobs-cancel": jobsCancel,
  "jobs-search": jobsSearch,
  assign,
  status,
  schedule,
  insights,
  activity,
  drivers,
  fleet,
  documents,
  health,
};
