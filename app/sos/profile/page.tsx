"use client";

import { useEffect, useState } from "react";
import { getEmergencyProfile, saveEmergencyProfile } from "@/lib/sos/actions";

const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

type ProfileForm = {
  phone: string;
  emergency_contact: string;
  blood_type: string;
  medical_conditions: string;
  allergies: string;
  emergency_contacts_json: string;
};

function ContactRow({
  index,
  contact,
  onChange,
  onRemove,
}: {
  index: number;
  contact: { name: string; phone: string; relationship: string };
  onChange: (i: number, field: string, value: string) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700">
      <div className="flex-1 grid sm:grid-cols-3 gap-2">
        <input
          type="text"
          placeholder="Name"
          value={contact.name}
          onChange={(e) => onChange(index, "name", e.target.value)}
          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-sm focus-visible:outline-2 focus-visible:outline-red-500"
        />
        <input
          type="tel"
          placeholder="Phone"
          value={contact.phone}
          onChange={(e) => onChange(index, "phone", e.target.value)}
          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-sm focus-visible:outline-2 focus-visible:outline-red-500"
        />
        <input
          type="text"
          placeholder="Relationship"
          value={contact.relationship}
          onChange={(e) => onChange(index, "relationship", e.target.value)}
          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-sm focus-visible:outline-2 focus-visible:outline-red-500"
        />
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        aria-label="Remove contact"
      >
        ✕
      </button>
    </div>
  );
}

export default function EmergencyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Array<{ name: string; phone: string; relationship: string }>>([]);
  const [form, setForm] = useState<ProfileForm>({
    phone: "",
    emergency_contact: "",
    blood_type: "",
    medical_conditions: "",
    allergies: "",
    emergency_contacts_json: "[]",
  });

  useEffect(() => {
    async function fetch() {
      const { data, error } = await getEmergencyProfile();
      if (error) {
        setError(error);
      } else if (data) {
        setForm(data);
        try {
          const parsed = JSON.parse(data.emergency_contacts_json);
          setContacts(Array.isArray(parsed) ? parsed : []);
        } catch {
          setContacts([]);
        }
      }
      setLoading(false);
    }
    fetch();
  }, []);

  function updateForm(field: keyof ProfileForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateContact(index: number, field: string, value: string) {
    setContacts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addContact() {
    setContacts((prev) => [...prev, { name: "", phone: "", relationship: "" }]);
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    form.emergency_contacts_json = JSON.stringify(contacts.filter((c) => c.name || c.phone));
    const res = await saveEmergencyProfile(form);
    if (res.error) setError(res.error);
    if (res.success) setSuccess(res.success);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-300 dark:border-slate-600 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">👤</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">Emergency Profile</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">Pre-fills your SOS requests</p>
          </div>
          <a href="/sos/create" className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors">
            New SOS →
          </a>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 pt-5 pb-8 space-y-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-red-500 dark:text-red-400 mb-4">Contact Info</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400" htmlFor="phone">Phone Number</label>
              <input id="phone" type="tel" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} placeholder="+91 98765 43210" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-sm focus-visible:outline-2 focus-visible:outline-red-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400" htmlFor="emergency_contact">Emergency Contact</label>
              <input id="emergency_contact" type="tel" value={form.emergency_contact} onChange={(e) => updateForm("emergency_contact", e.target.value)} placeholder="+91 98765 43210" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-sm focus-visible:outline-2 focus-visible:outline-red-500" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-red-500 dark:text-red-400 mb-4">Medical Info</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400" htmlFor="blood_type">Blood Type</label>
              <select id="blood_type" value={form.blood_type} onChange={(e) => updateForm("blood_type", e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-sm focus-visible:outline-2 focus-visible:outline-red-500">
                {BLOOD_TYPES.map((t) => (
                  <option key={t} value={t}>{t || "Select blood type"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400" htmlFor="medical_conditions">Medical Conditions</label>
              <input id="medical_conditions" type="text" value={form.medical_conditions} onChange={(e) => updateForm("medical_conditions", e.target.value)} placeholder="e.g. Diabetes, Asthma" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-sm focus-visible:outline-2 focus-visible:outline-red-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400" htmlFor="allergies">Allergies</label>
              <input id="allergies" type="text" value={form.allergies} onChange={(e) => updateForm("allergies", e.target.value)} placeholder="e.g. Penicillin, Peanuts" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-sm focus-visible:outline-2 focus-visible:outline-red-500" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-red-500 dark:text-red-400">Emergency Contacts</h2>
            <button type="button" onClick={addContact} className="text-xs font-bold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors">
              + Add Contact
            </button>
          </div>
          <div className="space-y-2">
            {contacts.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                No emergency contacts added. Add people responders can reach out to.
              </p>
            )}
            {contacts.map((contact, i) => (
              <ContactRow key={i} index={i} contact={contact} onChange={updateContact} onRemove={removeContact} />
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-semibold flex items-center gap-2" role="alert">
            <span>⚠️</span> {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm font-semibold flex items-center gap-2" role="status">
            <span>✅</span> {success}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-red-400 text-white text-sm font-extrabold transition-all flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-red-500"
        >
          {saving ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            "Save Emergency Profile"
          )}
        </button>

        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
          Your profile info will automatically pre-fill the SOS request form.
        </p>
      </form>
    </div>
  );
}
