import { redirect } from "next/navigation";

import { ActiveEventsPanel } from "@/components/dashboard/ActiveEventsPanel";
import { AlertStatusBar } from "@/components/dashboard/AlertStatusBar";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { CivilianDashboard } from "@/components/dashboard/CivilianDashboard";
import { DataSourcesFooter } from "@/components/dashboard/DataSourcesFooter";
import { OperatorProfile } from "@/components/dashboard/OperatorProfile";
import { ResponseChecklist } from "@/components/dashboard/ResponseChecklist";
import { SidebarLayout } from "@/components/dashboard/SidebarLayout";
import { StatCards } from "@/components/dashboard/StatCards";
import { IndiaMapSection } from "@/components/IndiaMapSection";
import { computeDashboardStats } from "@/lib/dashboard/compute-stats";
import { fetchDashboardEvents } from "@/lib/dashboard/fetch-events";
import type { AppRole } from "@/lib/sos/roles";
import type { DashboardProfile } from "@/lib/dashboard/types";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(AUTH_ROUTES.login);
  }

  const [{ data: profile }, events] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, username, app_role, organization, city, state, phone, emergency_contact, created_at",
      )
      .eq("id", user.id)
      .single(),
    fetchDashboardEvents(),
  ]);

  const stats = computeDashboardStats(
    events.eonetEvents,
    events.gdacsEvents,
    events.historicalGdacsEvents,
  );

  const appRole: AppRole = (profile?.app_role as AppRole) ?? "civilian";
  const dashboardProfile: DashboardProfile | null = profile
    ? {
        full_name: profile.full_name,
        username: profile.username,
        app_role: profile.app_role,
        organization: profile.organization,
        city: profile.city,
        state: profile.state,
        phone: profile.phone,
        emergency_contact: profile.emergency_contact,
        created_at: profile.created_at,
      }
    : null;

  const isCivilian = appRole === "civilian";

  return (
    <div className="dashboard-ops-bg min-h-screen">
      <SidebarLayout appRole={appRole}>
        {isCivilian ? (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-4xl">
              <div className="mb-6">
                <h1 className="text-lg font-semibold text-slate-100">
                  Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Emergency dashboard — manage SOS requests and emergency info
                </p>
              </div>
              <CivilianDashboard
                profile={
                  profile
                    ? { full_name: profile.full_name, city: profile.city, state: profile.state, phone: profile.phone }
                    : null
                }
              />
            </div>
          </div>
        ) : (
          <>
            <AlertStatusBar
              highestAlert={stats.highestAlert}
              liveEventCount={stats.liveEventCount}
              highAlertCount={stats.highAlertCount}
              lastRefreshed={stats.lastRefreshed}
            />

            <StatCards
              liveEventCount={stats.liveEventCount}
              eonetCount={stats.eonetCount}
              gdacsLiveCount={stats.gdacsLiveCount}
              historicalCount={stats.historicalCount}
              highAlertCount={stats.highAlertCount}
              redAlertCount={stats.redAlertCount}
            />

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <IndiaMapSection
                  eonetEvents={events.eonetEvents}
                  gdacsEvents={events.gdacsEvents}
                  historicalGdacsEvents={events.historicalGdacsEvents}
                  layout="embedded"
                />
              </div>

              <div className="flex flex-col gap-4">
                <ActiveEventsPanel events={stats.liveEvents} />
                <CategoryBreakdown items={stats.categoryBreakdown} />
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <OperatorProfile profile={dashboardProfile} email={user.email ?? "—"} />
              <div className="lg:col-span-2">
                <ResponseChecklist />
              </div>
            </div>

            <DataSourcesFooter />
          </>
        )}
      </SidebarLayout>
    </div>
  );
}
