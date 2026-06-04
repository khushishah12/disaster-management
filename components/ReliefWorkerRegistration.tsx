"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { signUp, type AuthActionState } from "@/lib/auth/actions";

const ROLES = [
  "civilian",
  "coordinator",
  "rescue_team",
  "ambulance_team",
  "fire_response",
  "hospital_coordinator",
  "shelter_department",
] as const;

const ROLE_DISPLAY: Record<string, string> = {
  civilian: "Civilian",
  coordinator: "Coordinator",
  rescue_team: "Rescue Team",
  ambulance_team: "Ambulance Team",
  fire_response: "Fire Response",
  hospital_coordinator: "Hospital Coordinator",
  shelter_department: "Shelter Department",
};

type PasswordStrength = "empty" | "weak" | "fair" | "good" | "strong";

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return "empty";
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(
    Boolean,
  ).length;

  if (score <= 2) return "weak";
  if (score === 3 || score === 4) return score === 4 ? "good" : "fair";
  return "strong";
}

const strengthConfig: Record<
  Exclude<PasswordStrength, "empty">,
  { label: string; width: string; color: string }
> = {
  weak: { label: "Weak", width: "25%", color: "bg-red-500" },
  fair: { label: "Fair", width: "50%", color: "bg-amber-500" },
  good: { label: "Good", width: "75%", color: "bg-sky-500" },
  strong: { label: "Strong", width: "100%", color: "bg-emerald-500" },
};

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconAt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3" />
      <path strokeLinecap="round" d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
    </svg>
  );
}

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path strokeLinecap="round" d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconAlert({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400/80">
      {children}
    </span>
  );
}

function InputField({
  id,
  label,
  type = "text",
  icon,
  placeholder,
  value,
  onChange,
  required = true,
}: {
  id: string;
  label: string;
  type?: string;
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-white/70">
        {label}
      </span>
      <div className="relative">
        <FieldIcon>{icon}</FieldIcon>
        <input
          id={id}
          name={id}
          type={type}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-cyan-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-cyan-500/20"
        />
      </div>
    </label>
  );
}

function InstructionBlock({
  icon,
  title,
  children,
  accent = "cyan",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: "cyan" | "amber" | "emerald";
}) {
  const sectionStyles = {
    cyan: "border-cyan-500/30 bg-cyan-500/5",
    amber: "border-amber-500/30 bg-amber-500/5",
    emerald: "border-emerald-500/30 bg-emerald-500/5",
  };
  const iconStyles = {
    cyan: "bg-cyan-500/15 text-cyan-400",
    amber: "bg-amber-500/15 text-amber-400",
    emerald: "bg-emerald-500/15 text-emerald-400",
  };

  return (
    <section className={`rounded-2xl border p-4 ${sectionStyles[accent]}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconStyles[accent]}`}>
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="space-y-2 text-sm leading-relaxed text-white/65">{children}</div>
    </section>
  );
}

const initialState: AuthActionState = {};

export default function ReliefWorkerRegistration() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    organization: "",
    city: "",
    state: "",
    role: ROLES[0],
    password: "",
    confirmPassword: "",
    emergencyContact: "",
    agreed: false,
  });

  const passwordStrength = useMemo(
    () => getPasswordStrength(form.password),
    [form.password],
  );

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (form.password !== form.confirmPassword) {
      e.preventDefault();
      alert("Passwords do not match.");
      return;
    }
    if (!form.agreed) {
      e.preventDefault();
      alert("Please agree to the emergency response data policies.");
      return;
    }
  };

  if (state.success) {
    return (
      <div className="relative min-h-screen overflow-hidden font-sans">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=2400&q=80')",
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px]" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-cyan-950/40 to-slate-900/95" aria-hidden />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/50 backdrop-blur-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <svg className="h-8 w-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-white">Registration Successful</h2>
            <p className="mt-3 text-sm text-white/60">{state.success}</p>
            <Link
              href={AUTH_ROUTES.login}
              className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-cyan-500"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden font-sans">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=2400&q=80')",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px]" aria-hidden />
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-cyan-950/40 to-slate-900/95"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col px-4 py-10 sm:px-6 lg:px-8">
        <header className="mx-auto mb-8 max-w-4xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium tracking-widest text-cyan-300 uppercase">
            <IconShield className="h-3.5 w-3.5" />
            Disaster Response Network
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
            Emergency Response Registration
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
            Join the disaster response network and help coordinate emergency rescue
            operations efficiently.
          </p>
        </header>

        <div
          className="registration-glass mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/50"
          role="region"
          aria-label="Registration"
        >
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="border-b border-white/10 p-6 sm:p-8 lg:border-r lg:border-b-0">
              <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
                {state.error ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                  >
                    {state.error}
                  </p>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <InputField
                      id="fullName"
                      label="Full Name"
                      icon={<IconUser className="h-4 w-4" />}
                      placeholder="Enter your full name"
                      value={form.fullName}
                      onChange={(v) => update("fullName", v)}
                    />
                  </div>
                  <InputField
                    id="username"
                    label="Username"
                    icon={<IconAt className="h-4 w-4" />}
                    placeholder="relief_worker01"
                    value={form.username}
                    onChange={(v) => update("username", v)}
                  />
                  <InputField
                    id="email"
                    label="Email Address"
                    type="email"
                    icon={<IconMail className="h-4 w-4" />}
                    placeholder="you@organization.org"
                    value={form.email}
                    onChange={(v) => update("email", v)}
                  />
                  <InputField
                    id="phone"
                    label="Phone Number"
                    type="tel"
                    icon={<IconPhone className="h-4 w-4" />}
                    placeholder="+1 (555) 000-0000"
                    value={form.phone}
                    onChange={(v) => update("phone", v)}
                  />
                  {form.role === "civilian" ? (
                    <>
                      <InputField
                        id="state"
                        label="State"
                        icon={<IconMapPin className="h-4 w-4" />}
                        placeholder="e.g. Gujarat"
                        value={form.state}
                        onChange={(v) => update("state", v)}
                      />
                      <InputField
                        id="city"
                        label="City"
                        icon={<IconMapPin className="h-4 w-4" />}
                        placeholder="e.g. Ahmedabad"
                        value={form.city}
                        onChange={(v) => update("city", v)}
                      />
                    </>
                  ) : (
                    <InputField
                      id="organization"
                      label={form.role === "hospital_coordinator" ? "Hospital Name" : "Organization / NGO Name"}
                      icon={<IconBuilding className="h-4 w-4" />}
                      placeholder={form.role === "hospital_coordinator" ? "Hospital / medical facility name" : "Relief organization name"}
                      value={form.organization}
                      onChange={(v) => update("organization", v)}
                    />
                  )}
                </div>

                <label htmlFor="role" className="block">
                  <span className="mb-1.5 block text-xs font-medium tracking-wide text-white/70">
                    Role
                  </span>
                  <div className="relative">
                    <FieldIcon>
                      <IconShield className="h-4 w-4" />
                    </FieldIcon>
                    <select
                      id="role"
                      name="role"
                      value={form.role}
                      onChange={(e) => update("role", e.target.value)}
                      className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 py-2.5 pl-11 pr-10 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/20"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role} className="bg-slate-900 text-white">
                          {ROLE_DISPLAY[role]}
                        </option>
                      ))}
                    </select>
                    <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  </div>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="password" className="block">
                      <span className="mb-1.5 block text-xs font-medium tracking-wide text-white/70">
                        Password
                      </span>
                      <div className="relative">
                        <FieldIcon>
                          <IconLock className="h-4 w-4" />
                        </FieldIcon>
                        <input
                          id="password"
                          name="password"
                          type="password"
                          required
                          placeholder="••••••••"
                          value={form.password}
                          onChange={(e) => update("password", e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/20"
                        />
                      </div>
                    </label>
                    {form.password && passwordStrength !== "empty" && (
                      <div className="mt-2">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-white/50">Password strength</span>
                          <span
                            className={
                              passwordStrength === "strong"
                                ? "text-emerald-400"
                                : passwordStrength === "good"
                                  ? "text-sky-400"
                                  : passwordStrength === "fair"
                                    ? "text-amber-400"
                                    : "text-red-400"
                            }
                          >
                            {strengthConfig[passwordStrength].label}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${strengthConfig[passwordStrength].color}`}
                            style={{ width: strengthConfig[passwordStrength].width }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <label htmlFor="confirmPassword" className="block">
                    <span className="mb-1.5 block text-xs font-medium tracking-wide text-white/70">
                      Confirm Password
                    </span>
                    <div className="relative">
                      <FieldIcon>
                        <IconLock className="h-4 w-4" />
                      </FieldIcon>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={form.confirmPassword}
                        onChange={(e) => update("confirmPassword", e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/20"
                      />
                    </div>
                  </label>
                </div>

                <InputField
                  id="emergencyContact"
                  label="Emergency Contact Number"
                  type="tel"
                  icon={<IconAlert className="h-4 w-4" />}
                  placeholder="Emergency contact phone"
                  value={form.emergencyContact}
                  onChange={(v) => update("emergencyContact", v)}
                />

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                  <input
                    type="checkbox"
                    checked={form.agreed}
                    onChange={(e) => update("agreed", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 text-cyan-500 focus:ring-cyan-500/30"
                  />
                  <span className="text-sm text-white/70">
                    I agree to emergency response data policies
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3.5 text-sm font-semibold tracking-wide text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-cyan-500 hover:shadow-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Creating account…" : "Create Account"}
                </button>

                <p className="text-center text-sm text-white/50">
                  Already have an account?{" "}
                  <Link
                    href={AUTH_ROUTES.login}
                    className="font-medium text-cyan-400 transition hover:text-cyan-300"
                  >
                    Login
                  </Link>
                </p>
              </form>
            </div>

            <aside className="flex flex-col justify-center gap-4 bg-white/[0.02] p-6 sm:p-8">
              <div className="mb-1">
                <h2 className="text-lg font-semibold text-white">Account Guidelines</h2>
                <p className="mt-1 text-sm text-white/50">
                  Follow these rules to secure your emergency coordination access.
                </p>
              </div>

              <InstructionBlock
                accent="cyan"
                title="Username Rules"
                icon={<IconAt className="h-4 w-4" />}
              >
                <ul className="list-inside list-disc space-y-1">
                  <li>5–15 characters</li>
                  <li>Letters, numbers, underscores only</li>
                </ul>
                <p className="mt-2 rounded-lg bg-black/20 px-3 py-2 font-mono text-xs text-cyan-200/90">
                  Example: relief_worker01
                </p>
              </InstructionBlock>

              <InstructionBlock
                accent="amber"
                title="Password Rules"
                icon={<IconLock className="h-4 w-4" />}
              >
                <ul className="list-inside list-disc space-y-1">
                  <li>Minimum 8 characters</li>
                  <li>Must contain:</li>
                </ul>
                <ul className="ml-4 list-inside list-disc space-y-0.5 text-white/55">
                  <li>1 uppercase letter</li>
                  <li>1 lowercase letter</li>
                  <li>1 number</li>
                  <li>1 special character</li>
                </ul>
                <p className="mt-2 rounded-lg bg-black/20 px-3 py-2 font-mono text-xs text-amber-200/90">
                  Example: Rescue@123
                </p>
              </InstructionBlock>

              <InstructionBlock
                accent="emerald"
                title="Security Notes"
                icon={<IconShield className="h-4 w-4" />}
              >
                <ul className="space-y-2">
                  <li>Do not share credentials with unauthorized personnel</li>
                  <li>Use strong passwords for secure emergency coordination</li>
                  <li>Keep emergency worker accounts protected</li>
                </ul>
              </InstructionBlock>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
