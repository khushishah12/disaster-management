export const RESCUE_TEAM_PAGE_SIZE = 10;

export type RescueTaskStatus = "pending" | "assigned" | "in_progress" | "completed";

export type DisasterRow = {
  id: string;
  title: string;
  disaster_type: string;
  location: string;
  severity: "low" | "moderate" | "high" | "critical";
  response_status: "active" | "monitoring" | "resolved";
  reported_at: string;
  created_at: string;
  updated_at: string;
};

export type RescueTeamMemberRow = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  base_location: string | null;
  skills: string[];
  notes: string | null;
  assigned_disaster_id: string | null;
  assigned_disaster: DisasterRow | null;
  task_status: RescueTaskStatus;
  priority: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RescueTeamFormInput = {
  name: string;
  role: string;
  phone: string;
  email: string;
  base_location: string;
  skills: string[];
  notes: string;
  assigned_disaster_id: string | null;
  task_status: RescueTaskStatus;
  priority: number;
};

export type RescueTeamsPageResult = {
  members: RescueTeamMemberRow[];
  disasters: DisasterRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};
