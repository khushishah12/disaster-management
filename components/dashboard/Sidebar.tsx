"use client";

import { useCallback, useMemo } from "react";
import type { AppRole } from "@/lib/sos/roles";

export type TabId =
  | "operations"
  | "disaster-map"
  | "ai-intel"
  | "rescue-teams"
  | "hospitals"
  | "analytics"
  | "data-contribution"
  | "ambulance-ops"
  | "fire-ops"
  | "rescue-ops"
  | "sos-response"
  | "sos-assignments"
  | "sos"
  | "nearby-help";

type NavItem = {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  roles: AppRole[];
};

type SidebarProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  appRole: AppRole;
};

const ALL_ROLES: AppRole[] = ["civilian", "coordinator", "rescue_team", "ambulance_team", "fire_response"];
const RESPONDER_ROLES: AppRole[] = ["coordinator"];

const NAV_ITEMS: NavItem[] = [
  {
    id: "operations",
    label: "Dashboard",
    roles: ALL_ROLES,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: "ai-intel",
    label: "AI Disaster Intelligence",
    roles: RESPONDER_ROLES,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a8 8 0 0 0-8 8c0 5 8 12 8 12s8-7 8-12a8 8 0 0 0-8-8z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    id: "disaster-map",
    label: "Disaster Map",
    roles: RESPONDER_ROLES,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
  },
  {
    id: "rescue-teams",
    label: "Rescue Teams",
    roles: RESPONDER_ROLES,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "hospitals",
    label: "Hospitals and Shelters",
    roles: RESPONDER_ROLES,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: "analytics",
    label: "Incident History and Analytics",
    roles: ["coordinator"],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: "data-contribution",
    label: "Data Contributions",
    roles: RESPONDER_ROLES,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    id: "sos-response",
    label: "SOS Response Management",
    roles: ["coordinator"],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9H9l-3-9H2" />
        <circle cx="12" cy="5" r="2" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    ),
  },
  {
    id: "sos-assignments",
    label: "SOS Assignments",
    roles: ["rescue_team", "ambulance_team", "fire_response"],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: "fire-ops",
    label: "Fire Response Ops",
    roles: ["fire_response"],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: "rescue-ops",
    label: "Rescue Ops",
    roles: ["rescue_team"],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9H9l-3-9H2" />
        <circle cx="12" cy="5" r="2" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    ),
  },
  {
    id: "ambulance-ops",
    label: "Ambulance Ops",
    roles: ["ambulance_team"],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 12h-4l-3 9H9l-3-9H2" />
        <path d="M9 3h6l2 4H7l2-4z" />
        <circle cx="9" cy="16" r="1" />
        <circle cx="15" cy="16" r="1" />
      </svg>
    ),
  },
  {
    id: "nearby-help",
    label: "Nearby Help",
    roles: ["civilian"],
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    id: "sos",
    label: "SOS Form",
    roles: ["civilian"],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
];

export const Sidebar = ({ activeTab, onTabChange, appRole }: SidebarProps) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, tab: TabId) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onTabChange(tab);
      }
    },
    [onTabChange],
  );

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.roles.includes(appRole)),
    [appRole],
  );

  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-800 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a8 8 0 0 0-8 8c0 5 8 12 8 12s8-7 8-12a8 8 0 0 0-8-8z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-slate-200">
          RescueRoute AI
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Sidebar navigation">
        {visibleItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onTabChange(item.id)}
              onKeyDown={(e) => handleKeyDown(e, item.id)}
              className={`mb-1 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-teal-500/10 text-teal-300"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={`shrink-0 ${isActive ? "text-teal-400" : "text-slate-500"}`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>
    </>
  );
};
