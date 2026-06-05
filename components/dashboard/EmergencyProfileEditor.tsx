"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEmergencyProfile, saveEmergencyProfile } from "@/lib/sos/actions";

type Props = {
  onDone: () => void;
};

export function EmergencyProfileEditor({ onDone }: Props) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["emergency-profile"],
    queryFn: async () => {
      const res = await getEmergencyProfile();
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [bloodType, setBloodType] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await saveEmergencyProfile({
      blood_type: bloodType || profile?.blood_type || "",
      medical_conditions: medicalConditions || profile?.medical_conditions || "",
      allergies: allergies || profile?.allergies || "",
      emergency_contact: emergencyContact || profile?.emergency_contact || "",
      phone: profile?.phone || "",
      emergency_contacts_json: profile?.emergency_contacts_json || "",
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Blood Type</label>
          <select
            value={bloodType || profile?.blood_type || ""}
            onChange={(e) => setBloodType(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200"
          >
            <option value="">Select...</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Medical Conditions</label>
          <textarea
            value={medicalConditions || profile?.medical_conditions || ""}
            onChange={(e) => setMedicalConditions(e.target.value)}
            rows={2}
            placeholder="e.g. Diabetes, Asthma..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Allergies</label>
          <textarea
            value={allergies || profile?.allergies || ""}
            onChange={(e) => setAllergies(e.target.value)}
            rows={2}
            placeholder="e.g. Penicillin, Latex..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Emergency Contact</label>
          <input
            type="text"
            value={emergencyContact || profile?.emergency_contact || ""}
            onChange={(e) => setEmergencyContact(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onDone}
          className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 text-xs font-bold hover:bg-slate-800">
          Back
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-[2] py-2.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-500 disabled:opacity-50">
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
