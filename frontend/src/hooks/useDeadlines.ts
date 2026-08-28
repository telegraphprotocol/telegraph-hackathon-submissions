import { useEffect, useState } from "react";
import { apiClient } from "../lib/apiClient";
import type { Deadlines } from "../lib/types";

export function useDeadlines() {
  const [deadlines, setDeadlines] = useState<Deadlines | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient.getDeadlines().then((data) => {
      if (!cancelled) setDeadlines(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return deadlines;
}
