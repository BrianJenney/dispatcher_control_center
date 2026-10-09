import { demoUser } from "@/env-demo";

export function DemoHint() {
  return <p>{demoUser.email}</p>;
}
