"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCityFacilities, type CityFacility } from "@/lib/sos/actions";

const TABS = [
  { key: "hospital", label: "Hospitals", emoji: "🏥", color: "border-red-500/50 text-red-400" },
  { key: "police", label: "Police Stations", emoji: "👮", color: "border-blue-500/50 text-blue-400" },
  { key: "fire_station", label: "Fire Stations", emoji: "🚒", color: "border-orange-500/50 text-orange-400" },
  { key: "shelter", label: "Shelters", emoji: "🏠", color: "border-green-500/50 text-green-400" },
];

export function NearbyHelpPanel() {
  const [facilities, setFacilities] = useState<CityFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityName, setCityName] = useState("");
  const [activeTab, setActiveTab] = useState("hospital");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("Not logged in"); setLoading(false); return; }

        const { data: profile } = await supabase
          .from("profiles")
          .select("city, state")
          .eq("id", user.id)
          .single();

        if (cancelled) return;
        const city = profile?.city?.trim() || "Mumbai";
        const state = profile?.state?.trim() || "Maharashtra";
        setCityName(city);

        const result = await getCityFacilities(city, state);
        if (cancelled) return;

        if (result.error) {
          setError(result.error);
        } else if (result.facilities.length === 0) {
          setError(`No facilities found for ${city}.`);
        } else {
          setFacilities(result.facilities);
          const first = result.facilities.find((f) => f.type);
          if (first) setActiveTab(first.type);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load facilities.");
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const activeItems = facilities.filter((f) => f.type === activeTab).slice(0, 50);
  const tabCounts = Object.fromEntries(TABS.map((t) => [t.key, facilities.filter((f) => f.type === t.key).length]));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="dashboard-panel rounded-2xl border border-slate-800/60 overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">
                Nearby Help {cityName && <span className="text-slate-400 font-normal">— {cityName}</span>}
              </h2>
              <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
                Hospitals, police stations, fire stations, and shelters in your city.
              </p>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-slate-600 border-t-teal-400 rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-900/20 border border-red-800/50 text-red-300 text-sm font-semibold">{error}</div>
          )}

          {!loading && !error && facilities.length > 0 && (
            <>
              <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1" role="tablist">
                {TABS.map(({ key, label, emoji, color }) => {
                  const count = tabCounts[key] ?? 0;
                  if (count === 0) return null;
                  const active = activeTab === key;
                  return (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(key)}
                      className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-all ${
                        active
                          ? `bg-slate-800/60 border-slate-600 ${color}`
                          : "border-slate-700/50 text-slate-500 hover:text-slate-300 hover:border-slate-600 bg-transparent"
                      }`}
                    >
                      <span>{emoji}</span>
                      <span>{label}</span>
                      <span className={`text-[10px] ml-0.5 ${active ? "opacity-80" : "opacity-40"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 bg-slate-800/40">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Phone</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Distance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {activeItems.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">No entries found.</td>
                      </tr>
                    )}
                    {activeItems.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-200 truncate max-w-[220px] sm:max-w-sm">{f.name}</p>
                          {f.operator && <p className="text-xs text-slate-500 mt-0.5">{f.operator}</p>}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {f.phone ? (
                            <a href={`tel:${f.phone}`} className="text-teal-400 hover:text-teal-300 font-medium text-xs">{f.phone}</a>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-slate-300 font-mono text-xs">
                            {f.distance > 0 ? `${f.distance.toFixed(1)} km` : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!loading && !error && facilities.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-slate-400 text-sm">No facilities found for your city.</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-800/60 px-6 sm:px-8 py-3 bg-slate-900/30">
          <p className="text-[11px] text-slate-500">
            Data cached from OpenStreetMap. {facilities.length > 0 && `${facilities.length} total facilities.`}
          </p>
        </div>
      </div>
    </div>
  );
}
