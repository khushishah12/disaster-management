"use client";

import { useCallback, useEffect, useState } from "react";
import { getEmergencyProfile, saveEmergencyProfile } from "@/lib/sos/actions";

const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CompleteProfileModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [bloodType, setBloodType] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [contacts, setContacts] = useState<Array<{ name: string; phone: string; relationship: string }>>([]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await getEmergencyProfile();
    if (error) {
      setError(error);
    } else if (data) {
      setBloodType(data.blood_type);
      setMedicalConditions(data.medical_conditions);
      setAllergies(data.allergies);
      try {
        const parsed = JSON.parse(data.emergency_contacts_json);
        setContacts(Array.isArray(parsed) ? parsed : []);
      } catch {
        setContacts([]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      fetchProfile();
    }
  }, [open, fetchProfile]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const { data } = await getEmergencyProfile();
    const res = await saveEmergencyProfile({
      phone: data?.phone ?? "",
      emergency_contact: data?.emergency_contact ?? "",
      blood_type: bloodType,
      medical_conditions: medicalConditions,
      allergies: allergies,
      emergency_contacts_json: JSON.stringify(contacts.filter((c) => c.name || c.phone)),
    });

    if (res.error) setError(res.error);
    if (res.success) {
      setSuccess(res.success);
      setTimeout(() => onClose(), 1500);
    }
    setSaving(false);
  }

  function addContact() {
    setContacts((prev) => [...prev, { name: "", phone: "", relationship: "" }]);
  }

  function updateContact(i: number, field: string, value: string) {
    setContacts((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function removeContact(i: number) {
    setContacts((prev) => prev.filter((_, idx) => idx !== i));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-100">Complete Your Profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-teal-400 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 px-5 py-5 max-h-[70vh] overflow-y-auto">
            <fieldset>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Blood Type</label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus-visible:outline-2 focus-visible:outline-teal-500"
              >
                {BLOOD_TYPES.map((t) => (
                  <option key={t} value={t}>{t || "Select blood type"}</option>
                ))}
              </select>
            </fieldset>

            <fieldset>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Medical Conditions</label>
              <textarea
                value={medicalConditions}
                onChange={(e) => setMedicalConditions(e.target.value)}
                placeholder="e.g. Diabetes, Asthma, Heart condition"
                rows={2}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-teal-500 resize-none"
              />
            </fieldset>

            <fieldset>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Allergies</label>
              <textarea
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Penicillin, Peanuts, Latex"
                rows={2}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-teal-500 resize-none"
              />
            </fieldset>

            <fieldset>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-400">Emergency Contacts</label>
                <button type="button" onClick={addContact} className="text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors">
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {contacts.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-3">No contacts added yet.</p>
                )}
                {contacts.map((c, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-3 gap-1.5">
                      <input
                        type="text"
                        placeholder="Name"
                        value={c.name}
                        onChange={(e) => updateContact(i, "name", e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-teal-500"
                      />
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={c.phone}
                        onChange={(e) => updateContact(i, "phone", e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-teal-500"
                      />
                      <input
                        type="text"
                        placeholder="Relationship"
                        value={c.relationship}
                        onChange={(e) => updateContact(i, "relationship", e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-teal-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContact(i)}
                      className="shrink-0 mt-0.5 rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-red-400 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </fieldset>

            {error && (
              <div className="rounded-xl border border-red-800 bg-red-900/20 px-3 py-2 text-xs font-semibold text-red-300" role="alert">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-green-800 bg-green-900/20 px-3 py-2 text-xs font-semibold text-green-300" role="status">
                {success}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
