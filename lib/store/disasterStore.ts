import { create } from "zustand";
import type { DispatchMission } from "@/lib/dispatch/types";
import type { RouteData } from "@/lib/routing/types";

export type DisasterType = "Flood" | "Fire" | "Earthquake" | "Cyclone" | "Landslide";

export interface DisasterSituation {
  disasterType: DisasterType | "";
  severity: number;
  populationAffected: number;
  description: string;
  latitude: number | null;
  longitude: number | null;
}

type RouteParams = {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
} | null;

interface DisasterStore {
  situation: DisasterSituation;
  setDisasterType: (type: DisasterType | "") => void;
  setSeverity: (value: number) => void;
  setPopulationAffected: (value: number) => void;
  setDescription: (text: string) => void;
  setCoordinates: (lat: number, lng: number) => void;
  reset: () => void;

  showSos: boolean;
  showRadar: boolean;
  showFacilities: boolean;
  facilityRadius: number;
  toggleSos: () => void;
  toggleRadar: () => void;
  toggleFacilities: () => void;
  setFacilityRadius: (r: number) => void;

  routeParams: RouteParams;
  setRouteParams: (p: RouteParams) => void;
  clearRoute: () => void;

  dispatchMissions: DispatchMission[];
  setDispatchMissions: (m: DispatchMission[]) => void;
}

const INITIAL: DisasterSituation = {
  disasterType: "",
  severity: 5,
  populationAffected: 0,
  description: "",
  latitude: null,
  longitude: null,
};

export const useDisasterStore = create<DisasterStore>((set) => ({
  situation: { ...INITIAL },
  setDisasterType: (disasterType) =>
    set((state) => ({ situation: { ...state.situation, disasterType } })),
  setSeverity: (severity) =>
    set((state) => ({ situation: { ...state.situation, severity } })),
  setPopulationAffected: (populationAffected) =>
    set((state) => ({ situation: { ...state.situation, populationAffected } })),
  setDescription: (description) =>
    set((state) => ({ situation: { ...state.situation, description } })),
  setCoordinates: (latitude, longitude) =>
    set((state) => ({ situation: { ...state.situation, latitude, longitude } })),
  reset: () => set({ situation: { ...INITIAL } }),

  showSos: true,
  showRadar: false,
  showFacilities: true,
  facilityRadius: 25000,
  toggleSos: () => set((s) => ({ showSos: !s.showSos })),
  toggleRadar: () => set((s) => ({ showRadar: !s.showRadar })),
  toggleFacilities: () => set((s) => ({ showFacilities: !s.showFacilities })),
  setFacilityRadius: (facilityRadius) => set({ facilityRadius }),

  routeParams: null,
  setRouteParams: (routeParams) => set({ routeParams }),
  clearRoute: () => set({ routeParams: null }),

  dispatchMissions: [],
  setDispatchMissions: (dispatchMissions) => set({ dispatchMissions }),
}));
