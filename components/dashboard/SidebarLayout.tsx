"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Sidebar, type TabId } from "@/components/dashboard/Sidebar";
import { ROLE_LABELS } from "@/lib/sos/roles";
import { SosEmergencyCenter } from "@/components/sos/SosEmergencyCenter";
import { NearbyHelpPanel } from "@/components/sos/NearbyHelpPanel";
import { CompleteProfileModal } from "@/components/sos/CompleteProfileModal";
import { signOut } from "@/lib/auth/actions";
import type { AppRole } from "@/lib/sos/roles";

const AiResponseDashboard = dynamic(
  () => import("@/components/ai-response/AiResponseDashboard").then((m) => m.AiResponseDashboard),
  { ssr: false },
);
const RescueTeamsPanel = dynamic(
  () => import("@/components/dashboard/RescueTeamsPanel").then((m) => m.RescueTeamsPanel),
  { ssr: false },
);
const HospitalsSheltersPanel = dynamic(
  () => import("@/components/dashboard/HospitalsSheltersPanel").then((m) => m.HospitalsSheltersPanel),
  { ssr: false },
);
const IncidentHistoryAnalyticsPanel = dynamic(
  () => import("@/components/analytics/IncidentHistoryAnalyticsPanel").then((m) => m.IncidentHistoryAnalyticsPanel),
  { ssr: false },
);
const DataContributionPanel = dynamic(
  () => import("@/components/analytics/DataContributionPanel").then((m) => m.DataContributionPanel),
  { ssr: false },
);
const AmbulanceOpsPanel = dynamic(
  () => import("@/components/ambulance/AmbulanceOpsPanel").then((m) => m.AmbulanceOpsPanel),
  { ssr: false },
);
const SosResponsePanel = dynamic(
  () => import("@/components/sos/SosResponsePanel").then((m) => m.SosResponsePanel),
  { ssr: false },
);
const SosAssignmentsPanel = dynamic(
  () => import("@/components/sos/SosAssignmentsPanel").then((m) => m.SosAssignmentsPanel),
  { ssr: false },
);

type SidebarLayoutProps = {
  children: React.ReactNode;
  appRole: AppRole;
};

const PlaceholderContent = ({ label }: { label: string }) => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="max-w-md text-center">
      <p className="text-lg font-semibold text-slate-200">{label}</p>
      <p className="mt-2 text-sm text-slate-500">
        This feature is coming soon. Check back for updates.
      </p>
    </div>
  </div>
);

const TAB_CONTENT: Record<TabId, { label: string }> = {
  operations: { label: "Operations Dashboard" },
  "disaster-map": { label: "Disaster Map" },
  "ai-intel": { label: "AI Disaster Intelligence" },
  "rescue-teams": { label: "Rescue Teams" },
  hospitals: { label: "Hospitals and Shelters" },
  analytics: { label: "Incident History and Analytics" },
  "data-contribution": { label: "Data Contributions" },
  "ambulance-ops": { label: "Ambulance Operations" },
  "sos-response": { label: "SOS Response Management" },
  "sos-assignments": { label: "SOS Assignments" },
  sos: { label: "SOS Emergency" },
  "nearby-help": { label: "Nearby Help" },
};

export const SidebarLayout = ({
  children,
  appRole,
}: SidebarLayoutProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("operations");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const content = useMemo(() => {
    if (activeTab === "operations") return children;
    if (activeTab === "ai-intel") return <AiResponseDashboard />;
    if (activeTab === "rescue-teams") return <RescueTeamsPanel appRole={appRole} />;
    if (activeTab === "hospitals") {
      return <HospitalsSheltersPanel />;
    }
    if (activeTab === "sos") {
      return <SosEmergencyCenter appRole={appRole} />;
    }
    if (activeTab === "nearby-help") {
      return <NearbyHelpPanel />;
    }
    if (activeTab === "analytics") {
      return <IncidentHistoryAnalyticsPanel />;
    }
    if (activeTab === "data-contribution") {
      return <DataContributionPanel />;
    }
    if (activeTab === "ambulance-ops") {
      return <AmbulanceOpsPanel />;
    }
    if (activeTab === "sos-response") {
      return <SosResponsePanel />;
    }
    if (activeTab === "sos-assignments") {
      return <SosAssignmentsPanel />;
    }
    return <PlaceholderContent label={TAB_CONTENT[activeTab].label} />;
  }, [activeTab, children, appRole]);

  return (
    <div className="flex min-h-screen">
      <div
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-800 bg-slate-950 transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:relative lg:translate-x-0`}
      >
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} appRole={appRole} />
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-hidden
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800/60 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="-ml-2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 lg:hidden"
              aria-label="Open sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-teal-400/90">
                Relief operations
              </p>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-50">
                {TAB_CONTENT[activeTab].label}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-200 sm:inline-flex">
              {ROLE_LABELS[appRole] ?? appRole}
            </span>
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-medium text-teal-300 transition hover:border-teal-600 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
            >
              Complete Profile
            </button>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
              >
                Sign out
              </button>
            </form>
          </div>
          <CompleteProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
        </header>

        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
          {content}
        </main>
      </div>
    </div>
  );
};
