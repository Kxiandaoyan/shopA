"use client";

import { useEffect } from "react";

type AutoForwardProps = {
  href: string;
  delayMs?: number;
};

export function AutoForward({ href, delayMs = 80 }: AutoForwardProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.replace(href);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [delayMs, href]);

  return null;
}
