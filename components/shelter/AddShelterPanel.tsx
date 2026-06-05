"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { addShelter, type AddShelterForm } from "@/lib/shelter/actions";
import { getStates, getCitiesByState } from "@/lib/facilities/actions";

const FACILITY_OPTIONS = [
  "Drinking Water",
  "Electricity",
  "Kitchen",
  "Medical Room",
  "Sanitation",
  "Children Area",
  "Wheelchair Access",
];

export const AddShelterPanel = () => {
  const [form, setForm] = useState<AddShelterForm>({
    name: "",
    city: "",
    state: "",
    capacity: 0,
    address: "",
    phone: "",
    facilities: [],
  });
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: states = [] } = useQuery({
    queryKey: ["states"], queryFn: getStates, staleTime: 86400000,
  });

  const selectedState = states.find((st) => st.name === form.state);
  const { data: cities = [] } = useQuery({
    queryKey: ["cities", selectedState?.id],
    queryFn: () => getCitiesByState(selectedState!.id),
    enabled: !!selectedState, staleTime: 86400000,
  });

  const updateField = <K extends keyof AddShelterForm>(key: K, value: AddShelterForm[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const handleStateChange = (stateName: string) => { updateField("state", stateName); updateField("city", ""); };

  const toggleFacility = (facility: string) => {
    setForm((prev) => ({
      ...prev,
      facilities: prev.facilities?.includes(facility)
        ? prev.facilities.filter((f) => f !== facility)
        : [...(prev.facilities ?? []), facility],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!form.name || !form.city || !form.state || !form.capacity) {
      setMsg({ type: "error", text: "Name, city, state, and capacity are required." });
      return;
    }
    setSubmitting(true);
    const res = await addShelter(form);
    setSubmitting(false);
    if (res.error) {
      setMsg({ type: "error", text: res.error });
    } else {
      setMsg({ type: "success", text: `Shelter "${form.name}" added successfully.` });
      setForm({ name: "", city: "", state: "", capacity: 0, address: "", phone: "", facilities: [] });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Add New Shelter</h2>
        <p className="mt-1 text-sm text-slate-500">Register a new shelter facility. It will appear on the Hospitals &amp; Shelters page for coordinators.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Shelter Name *</label>
          <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. City Relief Shelter" className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-teal-600 placeholder-slate-500" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">State *</label>
            <select value={form.state} onChange={(e) => handleStateChange(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-teal-600">
              <option value="">Select state</option>
              {states.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">City *</label>
            <select value={form.city} onChange={(e) => updateField("city", e.target.value)} disabled={!form.state} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-teal-600 disabled:opacity-50">
              <option value="">Select city</option>
              {cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Capacity *</label>
            <input type="number" min={1} value={form.capacity || ""} onChange={(e) => updateField("capacity", parseInt(e.target.value) || 0)} placeholder="e.g. 200" className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-teal-600 placeholder-slate-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Phone</label>
            <input type="tel" value={form.phone ?? ""} onChange={(e) => updateField("phone", e.target.value)} placeholder="+91-XXXXXXXXXX" className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-teal-600 placeholder-slate-500" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Address</label>
          <input type="text" value={form.address ?? ""} onChange={(e) => updateField("address", e.target.value)} placeholder="e.g. Sector 5, Main Road" className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-teal-600 placeholder-slate-500" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Available Facilities</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FACILITY_OPTIONS.map((f) => (
              <label key={f} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-300 transition hover:border-slate-600">
                <input type="checkbox" checked={form.facilities?.includes(f) ?? false} onChange={() => toggleFacility(f)} className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500/30" />
                {f}
              </label>
            ))}
          </div>
        </div>

        {msg && (
          <div className={`rounded-xl p-3 text-sm ${msg.type === "error" ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
            {msg.text}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="submit" disabled={submitting || !form.name || !form.city || !form.state || !form.capacity} className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-teal-500 disabled:opacity-50">
            {submitting ? "Adding..." : "Add Shelter"}
          </button>
        </div>
      </form>
    </div>
  );
};
