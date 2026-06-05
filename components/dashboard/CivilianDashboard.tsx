"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getMyRequests, getEmergencyProfile, getCityFacilities } from "@/lib/sos/actions";
import { useRoute } from "@/lib/hooks/use-route";
import type { CityFacility } from "@/lib/sos/actions";

const FacilityMiniMap = dynamic(
  () => import("@/components/dashboard/FacilityMiniMap").then((m) => m.FacilityMiniMap),
  { ssr: false },
);

const EMERGENCY_ICONS: Record<string, string> = {
  medical: "🏥", fire: "🔥", flood: "🌊", earthquake: "🏚️",
  cyclone: "🌀", landslide: "⛰️", structural_collapse: "🏗️",
  road_accident: "🚗", missing_person: "🔍", other: "⚠️",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  acknowledged: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_progress: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  rescued: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  closed: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

const FACILITY_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  hospital: { label: "Hospital", icon: "🏥", color: "text-red-400" },
  police: { label: "Police", icon: "🚔", color: "text-blue-400" },
  fire_station: { label: "Fire Station", icon: "🚒", color: "text-orange-400" },
  shelter: { label: "Shelter", icon: "🏠", color: "text-emerald-400" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type CivilianDashboardProps = {
  profile: {
    full_name: string;
    city: string | null;
    state: string | null;
    phone: string | null;
  } | null;
};

export function CivilianDashboard({ profile }: CivilianDashboardProps) {
  const { data: requestsData } = useQuery({
    queryKey: ["my-requests"],
    queryFn: async () => {
      const res = await getMyRequests();
      return res.data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: emergencyProfile } = useQuery({
    queryKey: ["emergency-profile"],
    queryFn: async () => {
      const res = await getEmergencyProfile();
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ["city-facilities", profile?.city, profile?.state],
    queryFn: async () => {
      if (!profile?.city || !profile?.state) return [];
      const res = await getCityFacilities(profile.city, profile.state);
      return res.facilities;
    },
    enabled: !!profile?.city && !!profile?.state,
    staleTime: 10 * 60 * 1000,
  });

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const selectedFacility: CityFacility | undefined =
    facilities.find((f) => f.id === selectedFacilityId) ?? undefined;

  const hasValidCoords = (f: CityFacility | undefined) =>
    f && typeof f.lat === "number" && typeof f.lng === "number" && isFinite(f.lat) && isFinite(f.lng);

  const routeParams = selectedFacility && userPosition && hasValidCoords(selectedFacility)
    ? { fromLat: userPosition.lat, fromLng: userPosition.lng, toLat: selectedFacility.lat, toLng: selectedFacility.lng }
    : null;

  const { data: routeData, isLoading: routeLoading, error: routeError } = useRoute(routeParams);

  const requests = requestsData ?? [];
  const activeRequest = requests.find((r) =>
    ["pending", "acknowledged", "in_progress"].includes(r.status),
  );
  const recentRequests = requests.slice(0, 5);

  const handleGetLocationAndRoute = () => {
    if (!selectedFacility) return;
    setGeoError(null);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      (err) => {
        setGeoError("Location access denied. Enable GPS to plan a route.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleClearRoute = () => {
    setUserPosition(null);
    setSelectedFacilityId("");
  };

  return (
    <div className="space-y-4">
      {/* Quick SOS CTA */}
      <Link
        href="/sos/create"
        className="flex items-center justify-center gap-3 rounded-xl border-2 border-red-500/50 bg-red-500/10 px-6 py-5 transition-all hover:bg-red-500/20 hover:border-red-400"
      >
        <span className="text-2xl">🆘</span>
        <div>
          <p className="text-base font-bold text-red-400">Send Emergency SOS</p>
          <p className="text-xs text-red-400/70">Immediate help — one tap away</p>
        </div>
      </Link>

      {/* Active SOS Status */}
      {activeRequest ? (
        <div className="rounded-xl border border-orange-800/40 bg-orange-900/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{EMERGENCY_ICONS[activeRequest.emergency_type] || "⚠️"}</span>
              <div>
                <p className="text-sm font-semibold text-slate-200">{activeRequest.ticket_number}</p>
                <p className="text-xs capitalize text-slate-400">
                  {activeRequest.emergency_type.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold", STATUS_STYLES[activeRequest.status])}>
              {activeRequest.status.replace(/_/g, " ")}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {activeRequest.adults_count + activeRequest.children_count + activeRequest.elderly_count + activeRequest.injured_count} people
            </span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-500 capitalize">{activeRequest.severity} severity</span>
          </div>
          <Link
            href={`/sos/my-requests/${activeRequest.id}`}
            className="mt-3 inline-block text-xs font-medium text-teal-400 hover:text-teal-300"
          >
            View details →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800/40 bg-slate-900/20 p-4 text-center">
          <p className="text-sm text-slate-500">No active SOS requests</p>
          <p className="mt-1 text-xs text-slate-600">Your active requests will appear here</p>
        </div>
      )}

      {/* Recent Requests & Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recent Requests</h3>
            <Link href="/sos/my-requests" className="text-[10px] text-teal-400 hover:text-teal-300">View all →</Link>
          </div>
          {recentRequests.length === 0 ? (
            <p className="text-xs text-slate-600">No requests yet</p>
          ) : (
            <div className="space-y-2">
              {recentRequests.map((req) => (
                <Link
                  key={req.id}
                  href={`/sos/my-requests/${req.id}`}
                  className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2 transition hover:bg-slate-800/60"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{EMERGENCY_ICONS[req.emergency_type] || "⚠️"}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-200">{req.ticket_number}</p>
                      <p className="text-[10px] text-slate-500">{timeAgo(req.created_at)}</p>
                    </div>
                  </div>
                  <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold", STATUS_STYLES[req.status])}>
                    {req.status.replace(/_/g, " ")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Quick Actions</h3>
          <div className="space-y-2">
            <Link
              href="/sos/my-requests"
              className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2.5 text-xs text-slate-300 transition hover:bg-slate-800/60"
            >
              <span>📋</span> My Requests
            </Link>
            <Link
              href="/sos/nearby"
              className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2.5 text-xs text-slate-300 transition hover:bg-slate-800/60"
            >
              <span>🗺️</span> Nearby Help Map
            </Link>
            <Link
              href="/sos/profile"
              className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2.5 text-xs text-slate-300 transition hover:bg-slate-800/60"
            >
              <span>👤</span> Emergency Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Nearby Help (full width) */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nearby Help</h3>
          <Link href="/sos/nearby" className="text-[10px] text-teal-400 hover:text-teal-300">View map →</Link>
        </div>

        {facilities.length === 0 ? (
          <p className="text-xs text-slate-600">
            {profile?.city ? `No facilities cached for ${profile.city}` : "Complete your profile to see nearby facilities"}
          </p>
        ) : (
          <div className="space-y-3">
            {/* Facility dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedFacilityId}
                onChange={(e) => { setSelectedFacilityId(e.target.value); setUserPosition(null); }}
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-slate-200 focus:border-teal-500 focus:outline-none"
              >
                <option value="">Select a facility...</option>
                {Object.entries(
                  facilities.reduce<Record<string, CityFacility[]>>((acc, f) => {
                    if (!acc[f.type]) acc[f.type] = [];
                    acc[f.type].push(f);
                    return acc;
                  }, {}),
                ).map(([type, items]) => {
                  const meta = FACILITY_TYPES[type] ?? { label: type, icon: "📍", color: "text-slate-400" };
                  return (
                    <optgroup key={type} label={`${meta.icon} ${meta.label}`}>
                      {items.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.distance} km)
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>

              {selectedFacility && !userPosition && (
                <button
                  type="button"
                  onClick={handleGetLocationAndRoute}
                  disabled={isLocating || !hasValidCoords(selectedFacility)}
                  className="shrink-0 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-500 disabled:opacity-50"
                  title={!hasValidCoords(selectedFacility) ? "This facility has no map coordinates" : ""}
                >
                  {isLocating ? "Locating..." : "Get Route"}
                </button>
              )}

              {userPosition && (
                <button
                  type="button"
                  onClick={handleClearRoute}
                  className="shrink-0 rounded-lg border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
                >
                  Clear Route
                </button>
              )}
            </div>

            {geoError && (
              <p className="text-xs text-red-400">{geoError}</p>
            )}

            {/* Route results */}
            {routeLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
                Fetching route...
              </div>
            )}

            {routeError && (
              <p className="text-xs text-red-400">Failed to fetch route. Try again.</p>
            )}

            {routeData && routeData.routes.length > 0 && selectedFacility && (
              <>
                {/* Route info card */}
                <div className="rounded-lg border border-teal-700/40 bg-teal-900/10 p-3">
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                      <span className="text-slate-400">You</span>
                    </div>
                    <span className="text-slate-600">→</span>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                      <span className="text-slate-400">{selectedFacility.name}</span>
                    </div>
                    <span className="ml-auto text-slate-500">
                      {(routeData.routes[0].distance / 1000).toFixed(1)} km · {Math.round(routeData.routes[0].time / 60)} min
                    </span>
                  </div>
                </div>

                {/* Mini map with directions overlay (client-only) */}
                <FacilityMiniMap
                  routeData={routeData}
                  centerLat={userPosition?.lat ?? selectedFacility.lat}
                  centerLng={userPosition?.lng ?? selectedFacility.lng}
                  onClose={handleClearRoute}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* My Profile */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">My Profile</h3>
          <Link href="/sos/profile" className="text-[10px] text-teal-400 hover:text-teal-300">Edit →</Link>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2">
            <span className="text-xs text-slate-400">Blood Type</span>
            <span className="text-xs font-semibold text-slate-200">{emergencyProfile?.blood_type || "—"}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2">
            <span className="text-xs text-slate-400">Phone</span>
            <span className="text-xs text-slate-200">{profile?.phone || "—"}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2">
            <span className="text-xs text-slate-400">Emergency Contact</span>
            <span className="text-xs text-slate-200">{emergencyProfile?.emergency_contact || "—"}</span>
          </div>
          {emergencyProfile?.medical_conditions && (
            <div className="rounded-lg bg-slate-800/40 px-3 py-2">
              <p className="text-[10px] text-slate-500">Medical Conditions</p>
              <p className="text-xs text-slate-300">{emergencyProfile.medical_conditions}</p>
            </div>
          )}
          {emergencyProfile?.allergies && (
            <div className="rounded-lg bg-slate-800/40 px-3 py-2">
              <p className="text-[10px] text-slate-500">Allergies</p>
              <p className="text-xs text-slate-300">{emergencyProfile.allergies}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
