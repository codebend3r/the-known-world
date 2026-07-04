"use client";

import { createContext, useState, type ReactNode } from "react";

type TimelineClusterContextValue = {
  openId: string | null;
  setOpenId: (id: string | null) => void;
};

export const TimelineClusterContext =
  createContext<TimelineClusterContextValue | null>(null);

export function TimelineClusterProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <TimelineClusterContext.Provider value={{ openId, setOpenId }}>
      {children}
    </TimelineClusterContext.Provider>
  );
}
