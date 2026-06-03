"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { submitSosRequest, type SosActionResult } from "@/lib/sos/actions";
import { cn } from "@/lib/utils";

const EMERGENCY_TYPES = [
  { value: "medical", label: "Medical", emoji: "🆘" },
  { value: "fire", label: "Fire", emoji: "🔥" },
  { value: "flood", label: "Flood", emoji: "🌊" },
  { value: "earthquake", label: "Earthquake", emoji: "🏚️" },
  { value: "cyclone", label: "Cyclone", emoji: "🌀" },
  { value: "landslide", label: "Landslide", emoji: "⛰️" },
  { value: "structural_collapse", label: "Collapse", emoji: "🏗️" },
  { value: "road_accident", label: "Accident", emoji: "🚗" },
  { value: "missing_person", label: "Missing", emoji: "🔍" },
  { value: "other", label: "Other", emoji: "❗" },
] as const;

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical", color: "bg-red-600", textColor: "text-white", desc: "Immediate danger to life" },
  { value: "high", label: "High", color: "bg-orange-500", textColor: "text-white", desc: "Serious situation" },
  { value: "moderate", label: "Moderate", color: "bg-amber-500", textColor: "text-black", desc: "Needs attention" },
  { value: "low", label: "Low", color: "bg-green-600", textColor: "text-white", desc: "Under control" },
] as const;

const IMMEDIATE_NEEDS = [
  { value: "water", label: "Water", emoji: "🥤" },
  { value: "food", label: "Food", emoji: "🍲" },
  { value: "medical", label: "Medical", emoji: "🏥" },
  { value: "shelter", label: "Shelter", emoji: "🛖" },
  { value: "rescue", label: "Rescue", emoji: "🚁" },
  { value: "light", label: "Light", emoji: "🔦" },
  { value: "communication", label: "Communication", emoji: "📡" },
  { value: "transport", label: "Transport", emoji: "🚗" },
  { value: "power", label: "Power", emoji: "🔌" },
  { value: "ice", label: "Ice/ Cooling", emoji: "🧊" },
  { value: "clothing", label: "Clothing", emoji: "👕" },
  { value: "fire_equipment", label: "Fire Equipment", emoji: "🔥" },
] as const;

const ACCESSIBILITY_FLAGS = [
  { name: "wheelchair", label: "Wheelchair User", emoji: "♿" },
  { name: "stretcher_needed", label: "Stretcher Needed", emoji: "🛌" },
  { name: "visual_impairment", label: "Visual Impairment", emoji: "👁️" },
  { name: "hearing_impairment", label: "Hearing Impairment", emoji: "🦻" },
  { name: "mobility_limited", label: "Mobility Limited", emoji: "🚶" },
] as const;

const sosFormSchema = z.object({
  emergency_type: z.enum([
    "medical", "fire", "flood", "earthquake", "cyclone",
    "landslide", "structural_collapse", "road_accident", "missing_person", "other",
  ], { message: "Select the type of emergency" }),
  severity: z.enum(["critical", "high", "moderate", "low"]),
  adults_count: z.coerce.number().int().min(0).default(0),
  children_count: z.coerce.number().int().min(0).default(0),
  elderly_count: z.coerce.number().int().min(0).default(0),
  injured_count: z.coerce.number().int().min(0).default(0),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  address: z.string().max(500).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  immediate_needs: z.array(z.string()).default([]),
  accessibility_flags: z.record(z.string(), z.boolean()).default({}),
  phone_number: z.string().max(20).optional().or(z.literal("")),
  alternate_contact: z.string().max(20).optional().or(z.literal("")),
});

type SosFormValues = z.infer<typeof sosFormSchema>;

const SECTION_ORDER = [
  "emergency_type",
  "severity",
  "people",
  "location",
  "description",
  "media",
  "needs",
  "contacts",
  "accessibility",
] as const;

type SectionId = (typeof SECTION_ORDER)[number];

const SECTION_LABELS: Record<SectionId, string> = {
  emergency_type: "Emergency Type",
  severity: "Severity",
  people: "People Affected",
  location: "Location",
  description: "Description",
  media: "Media Upload",
  needs: "Immediate Needs",
  contacts: "Contacts",
  accessibility: "Accessibility",
};

function Stepper({ value, onChange, min = 0, max = 999 }: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-11 h-12 flex items-center justify-center text-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="flex-1 text-center text-xl font-bold tabular-nums text-slate-900 dark:text-white" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-11 h-12 flex items-center justify-center text-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

function SuccessScreen({ ticketNumber, onReset }: {
  ticketNumber: string;
  onReset: () => void;
}) {
  return (
    <div className="min-h-dvh bg-white dark:bg-slate-950 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-4xl mb-5">
        ✅
      </div>
      <h1 className="text-3xl font-extrabold text-green-600 dark:text-green-400 mb-1">
        SOS Sent Successfully!
      </h1>
      <p className="text-base text-slate-500 dark:text-slate-400">
        Help has been notified. Stay safe.
      </p>
      <div className="mt-6 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold mb-1">
          Your Ticket Number
        </p>
        <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white tracking-tight">
          {ticketNumber}
        </p>
      </div>
      <p className="mt-4 text-sm text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
        Save this number to track your request. Responders are being alerted now.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <a
          href="/sos/my-requests"
          className="flex-1 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-base font-bold text-center transition-colors"
        >
          Track My Request
        </a>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 py-3.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-base font-bold transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Submit Another
        </button>
      </div>
    </div>
  );
}

function SectionCard({ id, children, className }: {
  id: SectionId;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn(
        "rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 p-5 sm:p-6",
        className,
      )}
    >
      <h2
        id={`${id}-heading`}
        className="text-xs font-bold uppercase tracking-[0.15em] text-red-500 dark:text-red-400 mb-4"
      >
        {SECTION_LABELS[id]}
      </h2>
      {children}
    </section>
  );
}

const PEOPLE_FIELDS = [
  { formKey: "adults_count" as const, watchKey: "adults" as const, label: "Adults" },
  { formKey: "children_count" as const, watchKey: "children" as const, label: "Children" },
  { formKey: "elderly_count" as const, watchKey: "elderly" as const, label: "Elderly" },
  { formKey: "injured_count" as const, watchKey: "injured" as const, label: "Injured" },
] as const;

export default function CreateSosPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SosActionResult | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors },
  } = useForm<SosFormValues>({
    resolver: zodResolver(sosFormSchema),
    defaultValues: {
      emergency_type: undefined,
      severity: "high",
      adults_count: 0,
      children_count: 0,
      elderly_count: 0,
      injured_count: 0,
      latitude: 20.5937,
      longitude: 78.9629,
      address: "",
      description: "",
      immediate_needs: [],
      accessibility_flags: {},
      phone_number: "",
      alternate_contact: "",
    },
  });

  const watchedEmergencyType = watch("emergency_type");
  const watchedSeverity = watch("severity");
  const watchedNeeds = watch("immediate_needs");
  const watchedAccessFlags = watch("accessibility_flags");
  const watchedPeople = {
    adults: watch("adults_count"),
    children: watch("children_count"),
    elderly: watch("elderly_count"),
    injured: watch("injured_count"),
  };
  const watchedLat = watch("latitude");
  const watchedLng = watch("longitude");

  const onSubmit = async (values: SosFormValues) => {
    setIsSubmitting(true);
    setResult(null);
    try {
      const res = await submitSosRequest({
        emergency_type: values.emergency_type,
        severity: values.severity,
        adults_count: values.adults_count,
        children_count: values.children_count,
        elderly_count: values.elderly_count,
        injured_count: values.injured_count,
        latitude: values.latitude,
        longitude: values.longitude,
        address: values.address ?? "",
        description: values.description ?? "",
        immediate_needs: values.immediate_needs,
        accessibility_flags: values.accessibility_flags ?? {},
        phone_number: values.phone_number ?? "",
        alternate_contact: values.alternate_contact ?? "",
      });
      setResult(res);
    } catch {
      setResult({ error: "An unexpected error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  function getLocation() {
    setLocationError(null);
    setLocationCoords(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lng = Math.round(pos.coords.longitude * 10000) / 10000;
        setValue("latitude", lat, { shouldValidate: true });
        setValue("longitude", lng, { shouldValidate: true });
        setLocationCoords({ lat, lng });
        setLocating(false);
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location access denied. Allow location in browser settings or enter manually."
            : err.code === err.TIMEOUT
              ? "Location request timed out. Try again or enter coordinates."
              : "Could not get your location. Enable GPS/Wi-Fi or enter coordinates.";
        setLocationError(msg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }

  if (result?.success) {
    return (
      <SuccessScreen
        ticketNumber={result.ticketNumber ?? ""}
        onReset={() => {
          setResult(null);
          reset();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🆘</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">
              New Emergency Request
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Fill in the details to alert responders
            </p>
          </div>
          <a
            href="/sos/my-requests"
            className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
          >
            My Requests →
          </a>
        </div>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-2xl mx-auto px-4 pb-32 pt-5 flex flex-col gap-4"
        noValidate
        autoComplete="on"
      >

        {/* 1. Emergency Type */}
        <SectionCard id="emergency_type">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {EMERGENCY_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setValue("emergency_type", type.value, { shouldValidate: true })}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all min-h-[76px] focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2",
                  watchedEmergencyType === type.value
                    ? "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 shadow-sm"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-600",
                )}
                aria-pressed={watchedEmergencyType === type.value}
              >
                <span className="text-2xl" role="img" aria-hidden="true">{type.emoji}</span>
                <span className="text-[11px] font-semibold leading-tight">{type.label}</span>
              </button>
            ))}
          </div>
          {errors.emergency_type && (
            <p className="mt-2 text-sm text-red-500 font-medium flex items-center gap-1" role="alert">
              <span>⚠</span> {errors.emergency_type.message}
            </p>
          )}
        </SectionCard>

        {/* 2. Severity */}
        <SectionCard id="severity">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SEVERITY_OPTIONS.map((sev) => (
              <button
                key={sev.value}
                type="button"
                onClick={() => setValue("severity", sev.value)}
                className={cn(
                  "p-3.5 rounded-xl border-2 text-center transition-all min-h-[68px] focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2",
                  watchedSeverity === sev.value
                    ? `${sev.color} ${sev.textColor} border-transparent shadow-md`
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-600",
                )}
                aria-pressed={watchedSeverity === sev.value}
              >
                <span className="text-base font-black block">{sev.label}</span>
                <span className="text-[11px] font-medium opacity-75 leading-tight block mt-0.5">{sev.desc}</span>
              </button>
            ))}
          </div>
        </SectionCard>

        {/* 3. People Affected */}
        <SectionCard id="people">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PEOPLE_FIELDS.map((field) => (
              <div key={field.formKey}>
                <label className="block text-xs font-semibold mb-1.5 text-slate-500 dark:text-slate-400">
                  {field.label}
                </label>
                <Stepper
                  value={watchedPeople[field.watchKey]}
                  onChange={(v) => setValue(field.formKey, v as any)}
                />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 4. Location */}
        <SectionCard id="location">
          <button
            type="button"
            onClick={getLocation}
            disabled={locating}
            className="w-full py-3.5 px-5 mb-3 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-red-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2"
          >
            {locating ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Locating...
              </>
            ) : (
              <>
                <span>📍</span>
                Use My Current Location
              </>
            )}
          </button>

          {locationCoords && (
            <div className="mb-3 p-2.5 rounded-xl bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm font-semibold flex items-center gap-2">
              <span>✅</span> Location set: {locationCoords.lat}, {locationCoords.lng}
            </div>
          )}

          {locationError && (
            <p className="mb-3 text-sm text-red-500 font-medium flex items-center gap-1" role="alert">
              <span>⚠</span> {locationError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2.5 mb-2.5">
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400" htmlFor="lat">Latitude</label>
              <input
                id="lat"
                type="number"
                step="any"
                {...register("latitude", { valueAsNumber: true })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-sm font-mono focus-visible:outline-2 focus-visible:outline-red-500"
              />
              {errors.latitude && (
                <p className="text-xs text-red-500 mt-0.5 font-medium" role="alert">{errors.latitude.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400" htmlFor="lng">Longitude</label>
              <input
                id="lng"
                type="number"
                step="any"
                {...register("longitude", { valueAsNumber: true })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-sm font-mono focus-visible:outline-2 focus-visible:outline-red-500"
              />
              {errors.longitude && (
                <p className="text-xs text-red-500 mt-0.5 font-medium" role="alert">{errors.longitude.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400" htmlFor="address">Address (optional)</label>
            <input
              id="address"
              type="text"
              placeholder="Street, area, landmark..."
              {...register("address")}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-sm focus-visible:outline-2 focus-visible:outline-red-500"
            />
          </div>
        </SectionCard>

        {/* 5. Description */}
        <SectionCard id="description">
          <textarea
            rows={3}
            placeholder="Describe what's happening, how many are affected, what help is needed..."
            {...register("description")}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-sm resize-y focus-visible:outline-2 focus-visible:outline-red-500"
          />
        </SectionCard>

        {/* 6. Media Upload */}
        <SectionCard id="media">
          <div className="p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/20 text-center">
            <div className="text-3xl mb-2">📸</div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Photos &amp; videos help responders assess the situation
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Media upload coming soon
            </p>
          </div>
        </SectionCard>

        {/* 7. Immediate Needs */}
        <SectionCard id="needs">
          <div className="flex flex-wrap gap-2">
            {IMMEDIATE_NEEDS.map((need) => {
              const selected = watchedNeeds.includes(need.value);
              return (
                <button
                  key={need.value}
                  type="button"
                  onClick={() => {
                    const current = getValues("immediate_needs");
                    if (current.includes(need.value)) {
                      setValue("immediate_needs", current.filter((n) => n !== need.value));
                    } else {
                      setValue("immediate_needs", [...current, need.value]);
                    }
                  }}
                  className={cn(
                    "px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2",
                    selected
                      ? "bg-red-600 text-white border-red-600 shadow-sm"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600",
                  )}
                  aria-pressed={selected}
                >
                  <span role="img" aria-hidden="true">{need.emoji}</span> {need.label}
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* 8. Contacts */}
        <SectionCard id="contacts">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400" htmlFor="phone">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                {...register("phone_number")}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-sm focus-visible:outline-2 focus-visible:outline-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-500 dark:text-slate-400" htmlFor="alt-phone">
                Alternate Contact
              </label>
              <input
                id="alt-phone"
                type="tel"
                placeholder="+91 98765 43210"
                {...register("alternate_contact")}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-sm focus-visible:outline-2 focus-visible:outline-red-500"
              />
            </div>
          </div>
        </SectionCard>

        {/* 9. Accessibility */}
        <SectionCard id="accessibility">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {ACCESSIBILITY_FLAGS.map((flag) => {
              const checked = watchedAccessFlags?.[flag.name] === true;
              return (
                <button
                  key={flag.name}
                  type="button"
                  onClick={() => {
                    const current = getValues("accessibility_flags") ?? {};
                    setValue("accessibility_flags", { ...current, [flag.name]: !checked });
                  }}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all min-h-[48px] focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2",
                    checked
                      ? "bg-red-600 text-white border-red-600 shadow-sm"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600",
                  )}
                  role="switch"
                  aria-checked={checked}
                >
                  <span className="text-lg" role="img" aria-hidden="true">{flag.emoji}</span>
                  <span className="text-sm font-semibold leading-tight">{flag.label}</span>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Error */}
        {result?.error && (
          <div
            className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-semibold flex items-center gap-2"
            role="alert"
          >
            <span>⚠️</span>
            {result.error}
          </div>
        )}

        <div className="h-4" />

        {/* Fixed submit */}
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-slate-950 dark:via-slate-950/95 dark:to-transparent pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-red-400 text-white text-lg font-extrabold tracking-wider shadow-lg transition-all flex items-center justify-center gap-2.5 focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  SENDING...
                </>
              ) : (
                <>
                  <span className="text-xl">🆘</span>
                  SEND EMERGENCY SOS
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
