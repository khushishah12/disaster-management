// Standalone seed script — calls Supabase REST API directly
// No dev server needed. Run: node scripts/seed-standalone.mjs

const SUPABASE_URL = "https://yeloxfkabgwzriaftswm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XcQphW1itn6PC4Ht-TqHAA_lbRTln-S";

const FACILITY_QUERIES = [
  `node["amenity"="hospital"](around:RADIUS,LAT,LNG);`,
  `node["amenity"="police"](around:RADIUS,LAT,LNG);`,
  `node["amenity"="fire_station"](around:RADIUS,LAT,LNG);`,
  `node["emergency"="shelter"](around:RADIUS,LAT,LNG);`,
  `node["amenity"="shelter"](around:RADIUS,LAT,LNG);`,
];

const TYPE_MAP = { hospital: "hospital", police: "police", fire_station: "fire_station", shelter: "shelter" };

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

async function geocode(city, state) {
  const query = `${city}${state ? `, ${state}` : ""}, India`;
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
    { headers: { "User-Agent": "DisasterMgmt/1.0" }, signal: AbortSignal.timeout(10000) },
  );
  const data = await res.json();
  if (!data?.[0]) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function fetchOverpass(city, state) {
  const coords = await geocode(city, state);
  if (!coords) return [];
  const { lat, lng } = coords;
  const radius = 30000;
  const queries = FACILITY_QUERIES.map((q) => q.replace("RADIUS", radius).replace("LAT", lat).replace("LNG", lng));
  const ql = `[out:json][timeout:25][maxsize:4194304];(${queries.join("")});out body 80;`;

  const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(ql)}`, {
    headers: { "User-Agent": "DisasterMgmt/1.0" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) return [];
  const json = await res.json();
  const elements = json.elements ?? [];

  const seen = new Set();
  const results = [];
  for (const el of elements) {
    if (!el.tags || seen.has(el.id)) continue;
    seen.add(el.id);
    const tagKey = el.tags.amenity ?? el.tags.emergency ?? "";
    const fType = TYPE_MAP[tagKey];
    if (!fType) continue;
    const name = el.tags.name;
    if (!name) continue;
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    if (elLat == null || elLon == null) continue;
    results.push({
      city, state,
      name, type: fType,
      phone: el.tags.phone ?? el.tags["contact:phone"] ?? null,
      operator: el.tags.operator ?? null,
      latitude: elLat, longitude: elLon,
      distance_km: haversine(lat, lng, elLat, elLon),
      source: "overpass",
    });
  }
  return results;
}

async function insertSupabase(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/city_facilities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase insert error (${res.status}): ${text.slice(0, 200)}`);
  }
}

const CITIES = [
  // --- Metros & Major Cities ---
  ["Mumbai", "Maharashtra"], ["Delhi", "Delhi"], ["Bengaluru", "Karnataka"],
  ["Hyderabad", "Telangana"], ["Chennai", "Tamil Nadu"], ["Kolkata", "West Bengal"],
  ["Pune", "Maharashtra"], ["Jaipur", "Rajasthan"], ["Lucknow", "Uttar Pradesh"],
  ["Kanpur", "Uttar Pradesh"], ["Nagpur", "Maharashtra"], ["Indore", "Madhya Pradesh"],
  ["Bhopal", "Madhya Pradesh"], ["Patna", "Bihar"], ["Ludhiana", "Punjab"],
  ["Agra", "Uttar Pradesh"], ["Nashik", "Maharashtra"], ["Varanasi", "Uttar Pradesh"],
  ["Srinagar", "Jammu and Kashmir"], ["Amritsar", "Punjab"], ["Ranchi", "Jharkhand"],
  ["Coimbatore", "Tamil Nadu"], ["Jabalpur", "Madhya Pradesh"], ["Gwalior", "Madhya Pradesh"],
  ["Vijayawada", "Andhra Pradesh"], ["Jodhpur", "Rajasthan"], ["Madurai", "Tamil Nadu"],
  ["Raipur", "Chhattisgarh"], ["Kota", "Rajasthan"], ["Guwahati", "Assam"],
  ["Chandigarh", "Chandigarh"], ["Mysuru", "Karnataka"], ["Bhubaneswar", "Odisha"],
  ["Kochi", "Kerala"], ["Mangaluru", "Karnataka"], ["Dehradun", "Uttarakhand"],
  ["Shimla", "Himachal Pradesh"], ["Panaji", "Goa"], ["Imphal", "Manipur"],
  ["Shillong", "Meghalaya"], ["Aizawl", "Mizoram"], ["Agartala", "Tripura"],
  ["Kohima", "Nagaland"], ["Gangtok", "Sikkim"], ["Itanagar", "Arunachal Pradesh"],
  ["Puducherry", "Puducherry"], ["Thiruvananthapuram", "Kerala"],
  ["Tiruchirappalli", "Tamil Nadu"], ["Salem", "Tamil Nadu"],
  ["Warangal", "Telangana"], ["Cuttack", "Odisha"],
  ["Hubli", "Karnataka"], ["Aurangabad", "Maharashtra"],
  ["Solapur", "Maharashtra"], ["Bareilly", "Uttar Pradesh"],
  ["Aligarh", "Uttar Pradesh"], ["Moradabad", "Uttar Pradesh"],
  ["Jalandhar", "Punjab"], ["Gurugram", "Haryana"],
  ["Faridabad", "Haryana"],

  // --- All Gujarat Cities (districts + major towns) ---
  ["Ahmedabad", "Gujarat"], ["Surat", "Gujarat"], ["Vadodara", "Gujarat"],
  ["Rajkot", "Gujarat"], ["Bhavnagar", "Gujarat"], ["Jamnagar", "Gujarat"],
  ["Junagadh", "Gujarat"], ["Gandhinagar", "Gujarat"], ["Anand", "Gujarat"],
  ["Nadiad", "Gujarat"], ["Morbi", "Gujarat"], ["Surendranagar", "Gujarat"],
  ["Bharuch", "Gujarat"], ["Mehsana", "Gujarat"], ["Bhuj", "Gujarat"],
  ["Navsari", "Gujarat"], ["Palanpur", "Gujarat"], ["Patan", "Gujarat"],
  ["Porbandar", "Gujarat"], ["Valsad", "Gujarat"], ["Godhra", "Gujarat"],
  ["Dahod", "Gujarat"], ["Gandhidham", "Gujarat"], ["Veraval", "Gujarat"],
  ["Kalol", "Gujarat"], ["Botad", "Gujarat"], ["Amreli", "Gujarat"],
  ["Somnath", "Gujarat"], ["Modasa", "Gujarat"], ["Himatnagar", "Gujarat"],
  ["Jetpur", "Gujarat"], ["Keshod", "Gujarat"], ["Ankleshwar", "Gujarat"],
  ["Sidhpur", "Gujarat"], ["Vapi", "Gujarat"], ["Dharampur", "Gujarat"],
  ["Wadhwan", "Gujarat"], ["Chhota Udepur", "Gujarat"],
  ["Songadh", "Gujarat"], ["Vijapur", "Gujarat"], ["Visnagar", "Gujarat"],
  ["Kadi", "Gujarat"], ["Una", "Gujarat"], ["Dhrangadhra", "Gujarat"],
  ["Limbdi", "Gujarat"], ["Halvad", "Gujarat"], ["Thangadh", "Gujarat"],
  ["Dholka", "Gujarat"], ["Sanand", "Gujarat"], ["Viramgam", "Gujarat"],
  ["Mandal", "Gujarat"], ["Detroj", "Gujarat"],
  ["Dehgam", "Gujarat"], ["Bavla", "Gujarat"],
  ["Dhandhuka", "Gujarat"], ["Ranpur", "Gujarat"],
  ["Barwala", "Gujarat"], ["Chotila", "Gujarat"],
  ["Muli", "Gujarat"], ["Chuda", "Gujarat"],
  ["Lakhtar", "Gujarat"], ["Dasada", "Gujarat"],
  ["Paddhari", "Gujarat"], ["Kalawad", "Gujarat"],
  ["Jasdan", "Gujarat"], ["Gondal", "Gujarat"],
  ["Upleta", "Gujarat"], ["Dhoraji", "Gujarat"],
  ["Mangrol", "Gujarat"], ["Manavadar", "Gujarat"],
  ["Kutiyana", "Gujarat"], ["Ranavav", "Gujarat"],
  ["Bhanvad", "Gujarat"], ["Khambhalia", "Gujarat"],
  ["Kalyanpur", "Gujarat"], ["Okha", "Gujarat"],
  ["Dwarka", "Gujarat"], ["Borsad", "Gujarat"],
  ["Sojitra", "Gujarat"], ["Petlad", "Gujarat"],
  ["Khambhat", "Gujarat"], ["Kapadvanj", "Gujarat"],
  ["Virpur", "Gujarat"], ["Lunavada", "Gujarat"],
  ["Balasinor", "Gujarat"], ["Santrampur", "Gujarat"],
  ["Khedbrahma", "Gujarat"], ["Vadnagar", "Gujarat"],
  ["Kheralu", "Gujarat"], ["Unjha", "Gujarat"],
  ["Chanasma", "Gujarat"], ["Sami", "Gujarat"],
  ["Harij", "Gujarat"], ["Rapar", "Gujarat"],
  ["Bhachau", "Gujarat"], ["Anjar", "Gujarat"],
  ["Mandvi", "Gujarat"], ["Nalia", "Gujarat"],
  ["Mundra", "Gujarat"], ["Bilimora", "Gujarat"],
  ["Gandevi", "Gujarat"], ["Chikhli", "Gujarat"],
  ["Umbergaon", "Gujarat"], ["Daman", "Daman and Diu"],
  ["Silvassa", "Dadra and Nagar Haveli"],
];

let success = 0, failed = 0;

for (const [city, state] of CITIES) {
  process.stdout.write(`${city}... `);
  try {
    const facilities = await fetchOverpass(city, state);
    if (facilities.length === 0) {
      console.log("⚠️  no data");
      failed++;
      continue;
    }
    // Insert in batches of 50
    for (let i = 0; i < facilities.length; i += 50) {
      await insertSupabase(facilities.slice(i, i + 50));
    }
    const types = {};
    for (const f of facilities) types[f.type] = (types[f.type] || 0) + 1;
    const summary = Object.entries(types).map(([k, v]) => `${k}:${v}`).join(", ");
    console.log(`✅ ${facilities.length} (${summary})`);
    success++;
  } catch (err) {
    console.log(`❌ ${err.message}`);
    failed++;
  }
}

console.log(`\n=== Done ===`);
console.log(`Cities seeded: ${success}`);
console.log(`Failed: ${failed}`);
