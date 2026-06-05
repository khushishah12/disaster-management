export type RoutePoint = {
  lat: number;
  lng: number;
};

export type RouteInstruction = {
  text: string;
  distance: number;
  time: number;
  sign: number;
  street_name: string;
};

export type RouteLeg = {
  coordinates: RoutePoint[];
  distance: number;
  time: number;
  instructions?: RouteInstruction[];
};

export const ROUTE_COLORS = [
  "#16a34a",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export const ROUTE_LABELS = [
  "Fastest Route",
  "Alternate Route",
  "Scenic Route",
  "Short Route",
  "Coastal Route",
  "Highway Route",
  "Back Road",
];

export type RouteData = {
  routes: RouteLeg[];
  from: RoutePoint;
  to: RoutePoint;
};

export type RouteRisk = {
  label: "Low" | "Moderate" | "High" | "Critical";
  score: number;
};

export type RouteIncidentOption = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};
