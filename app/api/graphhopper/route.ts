import { NextResponse } from "next/server";

import type { RoutePoint, RouteLeg, RouteInstruction } from "@/lib/routing/types";

function generateMockRoutes(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): RouteLeg[] {
  const dlat = toLat - fromLat;
  const dlng = toLng - fromLng;
  const distKm = Math.sqrt(dlat * dlat + dlng * dlng) * 111;
  const baseDist = Math.round(distKm * 1000);
  const baseTime = Math.round((distKm / 40) * 3600);

  const jitters = [0.01, 0.04, 0.08, 0.12, 0.18];
  return jitters.map((jitter) => {
    const steps = 12;
    const coords: RoutePoint[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = fromLat + dlat * t + (Math.random() - 0.5) * jitter;
      const lng = fromLng + dlng * t + (Math.random() - 0.5) * jitter;
      coords.push({ lat, lng });
    }
    const factor = 1 + jitter * 2;
    return {
      coordinates: coords,
      distance: Math.round(baseDist * factor),
      time: Math.round(baseTime * factor),
    };
  });
}

type GraphHopperInstruction = {
  text: string;
  distance: number;
  time: number;
  sign: number;
  street_name: string;
};

type GraphHopperPath = {
  distance: number;
  time: number;
  points: {
    coordinates: [number, number][];
  };
  instructions: GraphHopperInstruction[];
};

export const GET = async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const fromLat = searchParams.get("fromLat");
    const fromLng = searchParams.get("fromLng");
    const toLat = searchParams.get("toLat");
    const toLng = searchParams.get("toLng");

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return NextResponse.json({ error: "fromLat, fromLng, toLat, toLng required" }, { status: 400 });
    }

    const fLat = parseFloat(fromLat);
    const fLng = parseFloat(fromLng);
    const tLat = parseFloat(toLat);
    const tLng = parseFloat(toLng);

    const apiKey = process.env.GRAPHOPPER_API_KEY;

    if (!apiKey) {
      const routes = generateMockRoutes(fLat, fLng, tLat, tLng);
      return NextResponse.json({ routes });
    }

    const params = new URLSearchParams();
    params.set("key", apiKey);
    params.append("point", `${fromLat},${fromLng}`);
    params.append("point", `${toLat},${toLng}`);
    params.set("vehicle", "car");
    params.set("locale", "en");
    params.set("instructions", "true");
    params.set("points_encoded", "false");
    params.set("calc_points", "true");
    params.set("elevation", "false");
    params.set("alternative_route.max_paths", "2");
    params.set("alternative_route.max_weight_factor", "1.4");
    params.set("alternative_route.max_share_factor", "0.6");

    const url = `https://graphhopper.com/api/1/route?${params.toString()}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "DisasterMgmt/1.0" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[GraphHopper] error (${res.status}): ${text.slice(0, 200)}`);
      return NextResponse.json({ error: `GraphHopper request failed (${res.status})` }, { status: 502 });
    }

    const json = await res.json();
    const paths: GraphHopperPath[] = json.paths ?? [];
    const message = json.message;

    if (paths.length === 0) {
      return NextResponse.json({ error: message ?? "No route found" }, { status: 404 });
    }

    function toRouteLeg(path: GraphHopperPath): RouteLeg {
      const coords = (path.points.coordinates ?? []).map(
        ([lng, lat]): RoutePoint => ({ lat, lng }),
      );
      const instructions: RouteInstruction[] = (path.instructions ?? []).map((inst) => ({
        text: inst.text,
        distance: Math.round(inst.distance),
        time: Math.round(inst.time / 1000),
        sign: inst.sign,
        street_name: inst.street_name,
      }));
      return {
        coordinates: coords,
        distance: Math.round(path.distance),
        time: Math.round(path.time / 1000),
        instructions,
      };
    }

    const routes = paths.map(toRouteLeg);

    return NextResponse.json(
      { routes },
      {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
      },
    );
  } catch (error) {
    console.error("[GraphHopper] error:", error);
    return NextResponse.json({ error: "Failed to fetch route" }, { status: 502 });
  }
};
