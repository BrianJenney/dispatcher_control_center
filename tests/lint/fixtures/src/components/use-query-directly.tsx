"use client";

import { useQuery } from "@tanstack/react-query";

export function Latest() {
  const latest = useQuery({ queryKey: ["latest"], queryFn: () => Promise.resolve("ok") });
  return <p>{latest.data}</p>;
}
