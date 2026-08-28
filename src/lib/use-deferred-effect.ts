"use client";

import { useEffect, type DependencyList } from "react";

/**
 * Run a side effect after commit. setState inside `run` is treated as an
 * async callback (allowed) instead of a synchronous effect update (lint error).
 */
export function useDeferredEffect(run: () => void | Promise<void>, deps: DependencyList) {
  useEffect(() => {
    const id = window.setTimeout(() => {
      void run();
    }, 0);
    return () => window.clearTimeout(id);
    // Query keys are supplied by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
