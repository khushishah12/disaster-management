export const ROLES = [
  "civilian",
  "coordinator",
  "rescue_team",
  "ambulance_team",
  "fire_response",
] as const;

export type AppRole = (typeof ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  civilian: "Civilian",
  coordinator: "Coordinator",
  rescue_team: "Rescue Team",
  ambulance_team: "Ambulance Team",
  fire_response: "Fire Response",
};

export const ROLE_COLORS: Record<AppRole, string> = {
  civilian: "#94a3b8",
  coordinator: "#8b5cf6",
  rescue_team: "#f59e0b",
  ambulance_team: "#3b82f6",
  fire_response: "#f97316",
};

const ROLE_HIERARCHY: Record<AppRole, number> = {
  civilian: 0,
  rescue_team: 1,
  ambulance_team: 1,
  fire_response: 1,
  coordinator: 2,
};

function gte(role: AppRole, min: AppRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[min];
}

export function canCreateSOS(_role: AppRole): boolean {
  return true;
}

export function canViewAllRequests(role: AppRole): boolean {
  return role === "coordinator";
}

export function canUpdateRequestStatus(role: AppRole): boolean {
  return role !== "civilian";
}

export function canAssignTeams(role: AppRole): boolean {
  return role === "coordinator";
}

export function canManageUsers(_role: AppRole): boolean {
  return false;
}

export function canViewAnalytics(role: AppRole): boolean {
  return role === "coordinator";
}

export function canBeAssigned(role: AppRole): boolean {
  return ["rescue_team", "ambulance_team", "fire_response"].includes(role);
}

export function canManageDispatch(role: AppRole): boolean {
  return role === "coordinator";
}

export function canCloseRequest(role: AppRole): boolean {
  return role === "coordinator";
}

export function canCancelOwn(role: AppRole, status: string): boolean {
  return role === "civilian" && status === "pending";
}

export function canViewAllMedia(role: AppRole): boolean {
  return role !== "civilian";
}

export function canDeleteRequest(_role: AppRole): boolean {
  return false;
}

export function isResponder(role: AppRole): boolean {
  return role !== "civilian";
}

export function getVisibleRoles(): AppRole[] {
  return ROLES.filter((r) => r !== "civilian");
}

export type RouteAccess = {
  path: string;
  label: string;
  icon: string;
  roles: AppRole[];
};

export const ROUTE_ACCESS: RouteAccess[] = [
  { path: "/sos/create", label: "New SOS", icon: "🆘", roles: ["civilian"] },
  { path: "/sos/my-requests", label: "My Requests", icon: "📋", roles: ["civilian"] },
  { path: "/sos/profile", label: "Emergency Profile", icon: "👤", roles: ["civilian"] },
  { path: "/sos/nearby", label: "Nearby Help", icon: "📍", roles: ["civilian"] },
  {
    path: "/sos/all-requests",
    label: "All Requests",
    icon: "📊",
    roles: ["coordinator", "rescue_team", "ambulance_team", "fire_response"],
  },
  { path: "/sos/dispatch", label: "Dispatch", icon: "🚁", roles: ["coordinator"] },
  { path: "/sos/analytics", label: "Analytics", icon: "📈", roles: ["coordinator"] },
];

export function getAccessibleRoutes(role: AppRole): RouteAccess[] {
  return ROUTE_ACCESS.filter((r) => r.roles.includes(role));
}
