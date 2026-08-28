"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ShellContextValue = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellStateProvider({
  children,
  defaultRightPanel = false,
}: {
  children: ReactNode;
  defaultRightPanel?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("babit-sidebar") === "collapsed";
  });
  const [rightPanelOpen, setRightPanelOpen] = useState(defaultRightPanel);

  const toggleSidebar = useCallback(() => {
    if (window.matchMedia("(min-width: 1280px)").matches) {
      setSidebarCollapsed((value) => {
        const next = !value;
        window.localStorage.setItem("babit-sidebar", next ? "collapsed" : "expanded");
        return next;
      });
    } else {
      setSidebarOpen((value) => !value);
    }
  }, []);

  const value = useMemo(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      sidebarCollapsed,
      toggleSidebar,
      rightPanelOpen,
      setRightPanelOpen,
    }),
    [sidebarOpen, sidebarCollapsed, rightPanelOpen, toggleSidebar],
  );
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within ShellStateProvider");
  return ctx;
}
