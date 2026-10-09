"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

type RecordLinkProps<R extends string> = Omit<ComponentProps<typeof Link>, "href" | "prefetch"> & { href: Route<R> };

export function RecordLink<R extends string>({ href, onMouseEnter, onFocus, onTouchStart, ...props }: RecordLinkProps<R>) {
  const router = useRouter();
  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onMouseEnter={(event) => {
        router.prefetch(href);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        router.prefetch(href);
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        router.prefetch(href);
        onTouchStart?.(event);
      }}
    />
  );
}
