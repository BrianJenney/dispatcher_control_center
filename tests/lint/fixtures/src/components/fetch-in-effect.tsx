"use client";

import { useEffect, useState } from "react";

export function LatestCheck() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    void fetch("/api/health").then(async (response) => {
      setLabel(await response.text());
    });
  }, []);
  return <p>{label}</p>;
}
