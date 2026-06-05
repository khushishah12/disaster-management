"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { getActiveResponderAssignments } from "@/lib/sos/actions";
import { createMission, tickMission } from "@/lib/dispatch/simulation";
import { STATUS_COLORS } from "@/lib/dispatch/types";
import { useDisasterStore } from "@/lib/store/disasterStore";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

const TEAM_TO_ASSET: Record<string, string> = {
  ambulance_team: "ambulance",
  rescue_team: "rescue_team",
  fire_response: "fire_truck",
};

const TEAM_LABELS: Record<string, string> = {
  ambulance_team: "Ambulance",
  rescue_team: "Rescue",
  fire_response: "Fire",
};

export function LiveDispatchPanel() {
  const dispatchMissions = useDisasterStore((s) => s.dispatchMissions);
  const setDispatchMissions = useDisasterStore((s) => s.setDispatchMissions);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadedRef = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["active-responder-assignments"],
    queryFn: getActiveResponderAssignments,
    refetchInterval: 30000,
  });

  const liveAssignments = data?.data ?? [];

  useEffect(() => {
    if (loadedRef.current || liveAssignments.length === 0) return;
    loadedRef.current = true;

    const newMissions = liveAssignments.map((a) => {
      const label = `${a.sos_ticket} — ${TEAM_LABELS[a.assigned_team] || a.assigned_team}`;
      const mission = createMission(a.incident_lat, a.incident_lng, label);
      mission.incidentId = a.request_id;
      mission.assets = mission.assets.map((asset, i) => {
        const teamKey = Object.entries(TEAM_TO_ASSET).find(([, v]) => v === asset.type)?.[0];
        if (teamKey && teamKey === a.assigned_team) {
          return {
            ...asset,
            lat: a.responder_lat ?? asset.lat,
            lng: a.responder_lng ?? asset.lng,
            status: "En Route" as const,
            label: `${TEAM_LABELS[a.assigned_team] || a.assigned_team} (${a.resource_count}x)`,
          };
        }
        return asset;
      });
      return mission;
    });

    setDispatchMissions([...dispatchMissions, ...newMissions]);
    if (newMissions.length > 0) setRunning(true);
  }, [liveAssignments]);

  useEffect(() => {
    if (running && dispatchMissions.length > 0) {
      intervalRef.current = setInterval(() => {
        setDispatchMissions(
          dispatchMissions
            .map((m) => tickMission(m))
            .filter((m) => !(m.status === "Completed" && Date.now() - m.createdAt > 120000)),
        );
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const allAssets = dispatchMissions.flatMap((m) =>
    m.assets.map((a) => ({ ...a, missionLabel: m.incidentLabel, incidentId: m.incidentId })),
  );
  const activeAssets = allAssets.filter((a) => a.status !== "Completed");
  const hasAny = dispatchMissions.length > 0;

  return (
    <div className="space-y-3">
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : liveAssignments.length === 0 ? (
        <p className="text-center text-xs text-slate-500">No active team responses yet.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-400">
              {liveAssignments.length} active team(s) responding
            </span>
            <span className="text-[10px] text-slate-500">
              {activeAssets.length} en route
            </span>
          </div>

          <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
            {dispatchMissions.map((mission) => {
              if (mission.assets.every((a) => a.status === "Completed")) return null;
              return (
                <div
                  key={mission.id}
                  className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-200 truncate max-w-[160px]">
                      {mission.incidentLabel}
                    </p>
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase"
                      style={{
                        color: STATUS_COLORS[mission.status],
                        backgroundColor: `${STATUS_COLORS[mission.status]}18`,
                      }}
                    >
                      {mission.status}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {mission.assets.filter((a) => a.status !== "Completed").map((asset) => (
                      <div key={asset.id} className="flex items-center gap-2 text-[11px]">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: STATUS_COLORS[asset.status] }}
                        />
                        <span className="text-slate-400 w-24 truncate">{asset.label}</span>
                        <span className="text-slate-500 w-16 text-[10px]">
                          {asset.status === "En Route"
                            ? `ETA ${Math.round(asset.eta / 60)}m`
                            : asset.status === "Assigned"
                              ? "Standby"
                              : asset.status === "On Scene"
                                ? "On site"
                                : "Done"}
                        </span>
                        <div className="ml-auto w-14 bg-slate-800 rounded-full h-1.5">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.round(asset.progress * 100)}%`,
                              backgroundColor: STATUS_COLORS[asset.status],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
