"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  getStates,
  getCitiesByState,
  getHospitals,
  getShelters,
  type HospitalRow,
  type ShelterRow,
  type StateRow,
} from "@/lib/facilities/actions";

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "beds", label: "Beds (High to Low)" },
  { value: "available", label: "Available (High to Low)" },
] as const;

type TabType = "hospitals" | "shelters";

const PER_PAGE = 12;

const SkeletonCard = () => (
  <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
    <div className="mb-3 h-5 w-3/4 rounded bg-slate-800" />
    <div className="mb-2 h-3 w-1/2 rounded bg-slate-800" />
    <div className="mb-4 h-3 w-2/3 rounded bg-slate-800" />
    <div className="flex gap-2">
      <div className="h-6 w-16 rounded-full bg-slate-800" />
      <div className="h-6 w-20 rounded-full bg-slate-800" />
    </div>
  </div>
);

const HospitalCard = ({ h }: { h: HospitalRow }) => (
  <div className="group rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm transition hover:border-teal-700/50 hover:bg-slate-900/80">
    <div className="mb-2 flex items-start justify-between">
      <h3 className="text-sm font-semibold text-slate-100">{h.name}</h3>
      {h.emergency_services && (
        <span className="ml-2 shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-400">24/7</span>
      )}
    </div>
    {h.address && <p className="mb-3 text-xs text-slate-500">{h.address}</p>}
    <div className="mb-3 grid grid-cols-3 gap-2">
      <div className="rounded-lg bg-slate-800/50 p-2 text-center">
        <p className="text-lg font-bold text-teal-300">{h.total_beds}</p>
        <p className="text-[10px] text-slate-500">Total Beds</p>
      </div>
      <div className="rounded-lg bg-slate-800/50 p-2 text-center">
        <p className="text-lg font-bold text-emerald-300">{h.available_beds}</p>
        <p className="text-[10px] text-slate-500">Available</p>
      </div>
      <div className="rounded-lg bg-slate-800/50 p-2 text-center">
        <p className="text-lg font-bold text-amber-300">{h.icu_beds}</p>
        <p className="text-[10px] text-slate-500">ICU Beds</p>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {h.oxygen_available && (
        <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-medium text-blue-400">Oxygen</span>
      )}
      {h.ambulance_available && (
        <span className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[10px] font-medium text-purple-400">Ambulance</span>
      )}
      {h.phone && (
        <a href={`tel:${h.phone}`} className="ml-auto rounded-lg bg-teal-500/10 px-3 py-1 text-[10px] font-medium text-teal-300 transition hover:bg-teal-500/20">Call</a>
      )}
    </div>
  </div>
);

const ShelterCard = ({ s }: { s: ShelterRow }) => (
  <div className="group rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm transition hover:border-amber-700/50 hover:bg-slate-900/80">
    <h3 className="mb-2 text-sm font-semibold text-slate-100">{s.name}</h3>
    {s.address && <p className="mb-3 text-xs text-slate-500">{s.address}</p>}
    <div className="mb-3 grid grid-cols-2 gap-2">
      <div className="rounded-lg bg-slate-800/50 p-2 text-center">
        <p className="text-lg font-bold text-teal-300">{s.capacity}</p>
        <p className="text-[10px] text-slate-500">Capacity</p>
      </div>
      <div className="rounded-lg bg-slate-800/50 p-2 text-center">
        <p className="text-lg font-bold text-emerald-300">{s.available_occupancy}</p>
        <p className="text-[10px] text-slate-500">Available</p>
      </div>
    </div>
    {s.facilities && s.facilities.length > 0 && (
      <div className="mb-3 flex flex-wrap gap-1.5">
        {s.facilities.map((f) => (
          <span key={f} className="rounded-full bg-slate-800/70 px-2 py-0.5 text-[10px] text-slate-400">{f}</span>
        ))}
      </div>
    )}
    {s.phone && (
      <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-3 py-1 text-[10px] font-medium text-amber-300 transition hover:bg-amber-500/20">Call</a>
    )}
  </div>
);

export const HospitalsSheltersPanel = () => {
  const [selectedState, setSelectedState] = useState<StateRow | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>("hospitals");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string>("name");
  const [page, setPage] = useState(1);
  const [stateSearch, setStateSearch] = useState("");
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const stateRef = useRef<HTMLDivElement>(null);

  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ["states"],
    queryFn: getStates,
    staleTime: 86400000,
  });

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ["cities", selectedState?.id],
    queryFn: () => getCitiesByState(selectedState!.id),
    enabled: !!selectedState,
    staleTime: 86400000,
  });

  const cityQueryId = useMemo(() => `${selectedState?.name ?? ""}::${selectedCity ?? ""}`, [selectedState?.name, selectedCity]);

  const {
    data: hospitalsData,
    isFetching: hospitalsFetching,
  } = useQuery({
    queryKey: ["hospitals-v3", cityQueryId],
    queryFn: () => getHospitals(selectedCity!, selectedState!.name),
    enabled: !!selectedCity && !!selectedState,
    staleTime: 300000,
  });

  const {
    data: sheltersData,
    isFetching: sheltersFetching,
  } = useQuery({
    queryKey: ["shelters-v3", cityQueryId],
    queryFn: () => getShelters(selectedCity!, selectedState!.name),
    enabled: !!selectedCity && !!selectedState,
    staleTime: 300000,
  });

  const hospitals = hospitalsData?.data ?? [];
  const shelters = sheltersData?.data ?? [];
  const loading = (tab === "hospitals" ? hospitalsFetching : sheltersFetching) && !(tab === "hospitals" ? hospitalsData : sheltersData);

  const filteredStateList = useMemo(
    () => (stateSearch ? states.filter((s) => s.name.toLowerCase().includes(stateSearch.toLowerCase())) : states),
    [states, stateSearch],
  );

  const filteredHospitals = useMemo(() => {
    let list = [...hospitals];
    if (search) {
      list = list.filter((h) => h.name.toLowerCase().includes(search.toLowerCase()) || (h.address ?? "").toLowerCase().includes(search.toLowerCase()));
    }
    if (sort === "beds") list.sort((a, b) => b.total_beds - a.total_beds);
    else if (sort === "available") list.sort((a, b) => b.available_beds - a.available_beds);
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [hospitals, search, sort]);

  const filteredShelters = useMemo(() => {
    let list = [...shelters];
    if (search) {
      list = list.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || (s.address ?? "").toLowerCase().includes(search.toLowerCase()));
    }
    if (sort === "available") list.sort((a, b) => b.available_occupancy - a.available_occupancy);
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [shelters, search, sort]);

  const totalPages = Math.ceil((tab === "hospitals" ? filteredHospitals.length : filteredShelters.length) / PER_PAGE);

  const paginated = useMemo(() => {
    const source = tab === "hospitals" ? filteredHospitals : filteredShelters;
    return source.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  }, [tab, filteredHospitals, filteredShelters, page]);

  useEffect(() => { setPage(1); }, [selectedCity, tab, search, sort]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (stateRef.current && !stateRef.current.contains(e.target as Node)) setStateDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const sortedCityList = useMemo(() => [...cities].sort((a, b) => a.name.localeCompare(b.name)), [cities]);

  const records =
    tab === "hospitals"
      ? paginated.map((item, idx) => <HospitalCard key={item.id || `h-${idx}`} h={item as HospitalRow} />)
      : paginated.map((item, idx) => <ShelterCard key={item.id || `s-${idx}`} s={item as ShelterRow} />);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Hospitals &amp; Shelters</h2>
        <p className="mt-1 text-sm text-slate-500">Browse hospital availability and shelter capacity by location.</p>
      </div>

      <div className="relative" ref={stateRef}>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">Select State</label>
        <button
          type="button"
          onClick={() => setStateDropdownOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-left text-sm text-slate-200 transition hover:border-slate-600"
        >
          <span>{selectedState ? selectedState.name : "Choose a state..."}</span>
          <svg className={`h-4 w-4 text-slate-500 transition ${stateDropdownOpen ? "rotate-180" : ""}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        {stateDropdownOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
            <div className="border-b border-slate-800 p-2">
              <input type="text" value={stateSearch} onChange={(e) => setStateSearch(e.target.value)} placeholder="Search states..." className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-teal-600" />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {statesLoading ? (
                <div className="p-4 text-center text-sm text-slate-500">Loading states...</div>
              ) : filteredStateList.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">No states found.</div>
              ) : (
                filteredStateList.map((s) => (
                  <button key={s.id} type="button" onClick={() => { setSelectedState(s); setSelectedCity(null); setStateSearch(""); setStateDropdownOpen(false); }} className={`w-full px-4 py-2.5 text-left text-sm transition hover:bg-slate-800 ${selectedState?.id === s.id ? "bg-teal-500/10 text-teal-300" : "text-slate-300"}`}>{s.name}</button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {selectedState && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Select City</label>
          {citiesLoading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-800" />)}
            </div>
          ) : sortedCityList.length === 0 ? (
            <p className="text-sm text-slate-500">No cities found for this state.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {sortedCityList.map((c) => (
                <button key={c.id} type="button" onClick={() => setSelectedCity(c.name)} className={`rounded-xl border px-3 py-2 text-center text-sm font-medium transition ${selectedCity === c.name ? "border-teal-600 bg-teal-500/15 text-teal-300" : "border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800/60"}`}>{c.name}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedCity && selectedState && (
        <div className="space-y-4" key={cityQueryId}>
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1">
            <button type="button" onClick={() => { setTab("hospitals"); setPage(1); }} className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === "hospitals" ? "bg-teal-500/15 text-teal-300 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}>Hospitals ({hospitals.length})</button>
            <button type="button" onClick={() => { setTab("shelters"); setPage(1); }} className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === "shelters" ? "bg-teal-500/15 text-teal-300 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}>Shelters ({shelters.length})</button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or address..." className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-teal-600" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-600">
              {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-400">No {tab === "hospitals" ? "hospitals" : "shelters"} found for {selectedCity}.</p>
                <p className="mt-1 text-xs text-slate-600">The city may not have {tab === "hospitals" ? "hospitals" : "shelters"} mapped yet. Try another city.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{records}</div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 disabled:opacity-40">Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} type="button" onClick={() => setPage(p)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${page === p ? "bg-teal-500/15 text-teal-300" : "bg-slate-900/60 text-slate-400 hover:text-slate-200"}`}>{p}</button>
              ))}
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
