"use client";

import { useState, useCallback } from "react";
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

const PEOPLE_FIELDS = [
  { name: "adults_count", label: "Adults 👤" },
  { name: "children_count", label: "Children 👶" },
  { name: "elderly_count", label: "Elderly 👴" },
  { name: "injured_count", label: "Injured 🩹" },
] as const;

const IMMEDIATE_NEEDS_OPTIONS = [
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

const ACCESSIBILITY_OPTIONS = [
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
  ], { message: "Please select the type of emergency" }),
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

function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-12 h-14 flex items-center justify-center text-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="flex-1 text-center text-2xl font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-12 h-14 flex items-center justify-center text-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

function SuccessScreen({
  ticketNumber,
  onReset,
}: {
  ticketNumber: string;
  onReset: () => void;
}) {
  return (
    <div className="min-h-dvh bg-white dark:bg-slate-950 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-5xl mb-6 animate-bounce">
        ✅
      </div>
      <h1 className="text-4xl font-extrabold text-green-600 dark:text-green-400 mb-2">
        SOS SENT!
      </h1>
      <p className="text-xl text-slate-600 dark:text-slate-400 mb-2">
        Help is on the way
      </p>
      <div className="mt-6 p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">
          Your Ticket Number
        </p>
        <p className="text-3xl font-mono font-bold text-slate-900 dark:text-white mt-1">
          {ticketNumber}
        </p>
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        Save this ticket number to track your request status. Responders have been alerted.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <a
          href="/sos/my-requests"
          className="flex-1 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-lg font-bold text-center transition-colors"
        >
          Track My Request
        </a>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 py-4 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-lg font-bold transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Submit Another
        </button>
      </div>
    </div>
  );
}

export default function CreateSosPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SosActionResult | null>(null);
  const [locating, setLocating] = useState(false);

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

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setResult({ error: "Geolocation is not supported by your browser. Enter coordinates manually." });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("latitude", Math.round(pos.coords.latitude * 10000) / 10000);
        setValue("longitude", Math.round(pos.coords.longitude * 10000) / 10000);
        setLocating(false);
      },
      () => {
        setResult({ error: "Could not get your location. Enable GPS or enter manually." });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [setValue]);

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
    <div className="min-h-dvh bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-50 bg-red-600 dark:bg-red-700 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <span className="text-3xl drop-shadow" role="img" aria-hidden="true">🆘</span>
        <div>
          <h1 className="text-xl font-bold tracking-tight drop-shadow-sm">SOS Emergency</h1>
          <p className="text-red-100 text-sm drop-shadow-sm opacity-90">Fill all critical fields to send</p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-2xl mx-auto px-4 pb-36 pt-6 flex flex-col gap-10"
        noValidate
        autoComplete="on"
      >
        {/* 1. Emergency Type */}
        <section aria-labelledby="sect-emergency">
          <h2 id="sect-emergency" className="text-lg font-extrabold uppercase tracking-widest text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-sm">1</span>
            Emergency Type <span className="text-red-500">*</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {EMERGENCY_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setValue("emergency_type", type.value, { shouldValidate: true })}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 text-center transition-all min-h-[88px] focus-visible:outline-4 focus-visible:outline-red-500 focus-visible:outline-offset-2",
                  watchedEmergencyType === type.value
                    ? "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 shadow-lg shadow-red-500/20"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md",
                )}
                aria-pressed={watchedEmergencyType === type.value}
              >
                <span className="text-3xl" role="img" aria-hidden="true">{type.emoji}</span>
                <span className="text-xs font-bold leading-tight">{type.label}</span>
              </button>
            ))}
          </div>
          {errors.emergency_type && (
            <p className="text-red-500 text-sm mt-2 font-medium flex items-center gap-1" role="alert">
              <span>⚠</span> {errors.emergency_type.message}
            </p>
          )}
        </section>

        {/* 2. Severity */}
        <section aria-labelledby="sect-severity">
          <h2 id="sect-severity" className="text-lg font-extrabold uppercase tracking-widest text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-sm">2</span>
            Severity
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SEVERITY_OPTIONS.map((sev) => (
              <button
                key={sev.value}
                type="button"
                onClick={() => setValue("severity", sev.value)}
                className={cn(
                  "p-4 rounded-2xl border-2 text-center transition-all min-h-[80px] focus-visible:outline-4 focus-visible:outline-red-500 focus-visible:outline-offset-2",
                  watchedSeverity === sev.value
                    ? `${sev.color} ${sev.textColor} border-transparent shadow-xl scale-105`
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600",
                )}
                aria-pressed={watchedSeverity === sev.value}
              >
                <span className="text-xl font-black block">{sev.label}</span>
                <span className="text-xs font-medium opacity-80 leading-tight block mt-1">{sev.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 3. People Affected */}
        <section aria-labelledby="sect-people">
          <h2 id="sect-people" className="text-lg font-extrabold uppercase tracking-widest text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-sm">3</span>
            People Affected
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PEOPLE_FIELDS.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-bold mb-2 text-slate-600 dark:text-slate-400">
                  {field.label}
                </label>
                <NumberStepper
                  value={
                    field.name === "adults_count" ? watchedPeople.adults :
                    field.name === "children_count" ? watchedPeople.children :
                    field.name === "elderly_count" ? watchedPeople.elderly :
                    watchedPeople.injured
                  }
                  onChange={(v) => setValue(field.name as keyof SosFormValues, v as any)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* 4. Location */}
        <section aria-labelledby="sect-location">
          <h2 id="sect-location" className="text-lg font-extrabold uppercase tracking-widest text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-sm">4</span>
            Location <span className="text-red-500">*</span>
          </h2>
          <button
            type="button"
            onClick={getLocation}
            disabled={locating}
            className="w-full py-4 px-6 mb-4 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-red-400 text-white font-extrabold text-lg flex items-center justify-center gap-3 transition-all shadow-lg focus-visible:outline-4 focus-visible:outline-red-500 focus-visible:outline-offset-2"
          >
            {locating ? (
              <>
                <span className="inline-block w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                Locating...
              </>
            ) : (
              <>
                <span className="text-2xl">📍</span>
                Use My Current Location
              </>
            )}
          </button>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400" htmlFor="lat">Latitude</label>
              <input
                id="lat"
                type="number"
                step="any"
                {...register("latitude", { valueAsNumber: true })}
                className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-lg font-mono focus-visible:outline-4 focus-visible:outline-red-500"
              />
              {errors.latitude && (
                <p className="text-red-500 text-sm mt-1 font-medium" role="alert">{errors.latitude.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400" htmlFor="lng">Longitude</label>
              <input
                id="lng"
                type="number"
                step="any"
                {...register("longitude", { valueAsNumber: true })}
                className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-lg font-mono focus-visible:outline-4 focus-visible:outline-red-500"
              />
              {errors.longitude && (
                <p className="text-red-500 text-sm mt-1 font-medium" role="alert">{errors.longitude.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400" htmlFor="address">Address (optional)</label>
            <input
              id="address"
              type="text"
              placeholder="Street, area, landmark, or nearest known location"
              {...register("address")}
              className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-lg focus-visible:outline-4 focus-visible:outline-red-500"
            />
          </div>
        </section>

        {/* 5. Description */}
        <section aria-labelledby="sect-desc">
          <h2 id="sect-desc" className="text-lg font-extrabold uppercase tracking-widest text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-sm">5</span>
            Description
          </h2>
          <textarea
            rows={4}
            placeholder="Describe what's happening — how many people are affected, what help is needed, any immediate dangers..."
            {...register("description")}
            className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-lg resize-y focus-visible:outline-4 focus-visible:outline-red-500"
          />
        </section>

        {/* 6. Media Upload */}
        <section aria-labelledby="sect-media">
          <h2 id="sect-media" className="text-lg font-extrabold uppercase tracking-widest text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-sm">6</span>
            Media Upload
          </h2>
          <div className="p-8 rounded-2xl border-3 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/30 text-center">
            <div className="text-5xl mb-4" role="img" aria-hidden="true">📸</div>
            <p className="text-xl font-bold text-slate-600 dark:text-slate-400">
          Photos &amp; videos help responders assess the situation
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
              Media upload will be available soon
            </p>
          </div>
        </section>

        {/* 7. Immediate Needs */}
        <section aria-labelledby="sect-needs">
          <h2 id="sect-needs" className="text-lg font-extrabold uppercase tracking-widest text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-sm">7</span>
            Immediate Needs
          </h2>
          <div className="flex flex-wrap gap-3">
            {IMMEDIATE_NEEDS_OPTIONS.map((need) => {
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
                    "px-5 py-3 rounded-2xl border-2 text-base font-bold transition-all focus-visible:outline-4 focus-visible:outline-red-500 focus-visible:outline-offset-2",
                    selected
                      ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-500/30"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600",
                  )}
                  aria-pressed={selected}
                >
                  <span role="img" aria-hidden="true">{need.emoji}</span> {need.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 8. Contacts */}
        <section aria-labelledby="sect-contacts">
          <h2 id="sect-contacts" className="text-lg font-extrabold uppercase tracking-widest text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-sm">8</span>
            Contact Information
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400" htmlFor="phone">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                {...register("phone_number")}
                className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-lg focus-visible:outline-4 focus-visible:outline-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400" htmlFor="alt-phone">
                Alternate Contact
              </label>
              <input
                id="alt-phone"
                type="tel"
                placeholder="+91 98765 43210"
                {...register("alternate_contact")}
                className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-lg focus-visible:outline-4 focus-visible:outline-red-500"
              />
            </div>
          </div>
        </section>

        {/* 9. Accessibility Flags */}
        <section aria-labelledby="sect-access">
          <h2 id="sect-access" className="text-lg font-extrabold uppercase tracking-widest text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-sm">9</span>
            Accessibility Flags
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {ACCESSIBILITY_OPTIONS.map((flag) => {
              const checked = watchedAccessFlags?.[flag.name] === true;
              return (
                <button
                  key={flag.name}
                  type="button"
                  onClick={() => {
                    const current = getValues("accessibility_flags") ?? {};
                    setValue("accessibility_flags", {
                      ...current,
                      [flag.name]: !checked,
                    });
                  }}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all min-h-[60px] focus-visible:outline-4 focus-visible:outline-red-500 focus-visible:outline-offset-2",
                    checked
                      ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-500/30"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600",
                  )}
                  role="switch"
                  aria-checked={checked}
                >
                  <span className="text-2xl" role="img" aria-hidden="true">{flag.emoji}</span>
                  <span className="font-bold text-sm leading-tight">{flag.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Global error */}
        {result?.error && (
          <div
            className="p-5 rounded-2xl bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 font-bold text-lg flex items-center gap-3"
            role="alert"
          >
            <span className="text-2xl">⚠️</span>
            {result.error}
          </div>
        )}

        {/* Spacer for fixed button */}
        <div className="h-8" />

        {/* Fixed bottom submit */}
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-gradient-to-t from-white via-white/95 to-transparent dark:from-slate-950 dark:via-slate-950/95 dark:to-transparent pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-red-400 text-white text-2xl font-black tracking-wider shadow-2xl transition-all flex items-center justify-center gap-3 focus-visible:outline-4 focus-visible:outline-red-500 focus-visible:outline-offset-2"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  SENDING...
                </>
              ) : (
                <>
                  <span className="text-3xl drop-shadow" role="img" aria-hidden="true">🆘</span>
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
