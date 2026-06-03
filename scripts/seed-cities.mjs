// Seed script for major Indian cities
// Run: node scripts/seed-cities.mjs
// Requires dev server running on http://localhost:3000

const API = "http://localhost:3000/api/seed-facilities";

const CITIES = [
  ["Mumbai", "Maharashtra"],
  ["Delhi", "Delhi"],
  ["Bengaluru", "Karnataka"],
  ["Hyderabad", "Telangana"],
  ["Ahmedabad", "Gujarat"],
  ["Chennai", "Tamil Nadu"],
  ["Kolkata", "West Bengal"],
  ["Pune", "Maharashtra"],
  ["Jaipur", "Rajasthan"],
  ["Lucknow", "Uttar Pradesh"],
  ["Surat", "Gujarat"],
  ["Kanpur", "Uttar Pradesh"],
  ["Nagpur", "Maharashtra"],
  ["Indore", "Madhya Pradesh"],
  ["Thane", "Maharashtra"],
  ["Bhopal", "Madhya Pradesh"],
  ["Visakhapatnam", "Andhra Pradesh"],
  ["Patna", "Bihar"],
  ["Vadodara", "Gujarat"],
  ["Ghaziabad", "Uttar Pradesh"],
  ["Ludhiana", "Punjab"],
  ["Agra", "Uttar Pradesh"],
  ["Nashik", "Maharashtra"],
  ["Faridabad", "Haryana"],
  ["Meerut", "Uttar Pradesh"],
  ["Rajkot", "Gujarat"],
  ["Kalyan-Dombivli", "Maharashtra"],
  ["Vasai-Virar", "Maharashtra"],
  ["Varanasi", "Uttar Pradesh"],
  ["Srinagar", "Jammu and Kashmir"],
  ["Aurangabad", "Maharashtra"],
  ["Dhanbad", "Jharkhand"],
  ["Amritsar", "Punjab"],
  ["Navi Mumbai", "Maharashtra"],
  ["Allahabad", "Uttar Pradesh"],
  ["Ranchi", "Jharkhand"],
  ["Haora", "West Bengal"],
  ["Coimbatore", "Tamil Nadu"],
  ["Jabalpur", "Madhya Pradesh"],
  ["Gwalior", "Madhya Pradesh"],
  ["Vijayawada", "Andhra Pradesh"],
  ["Jodhpur", "Rajasthan"],
  ["Madurai", "Tamil Nadu"],
  ["Raipur", "Chhattisgarh"],
  ["Kota", "Rajasthan"],
  ["Guwahati", "Assam"],
  ["Chandigarh", "Chandigarh"],
  ["Solapur", "Maharashtra"],
  ["Hubli", "Karnataka"],
  ["Mysuru", "Karnataka"],
  ["Tiruchirappalli", "Tamil Nadu"],
  ["Bareilly", "Uttar Pradesh"],
  ["Aligarh", "Uttar Pradesh"],
  ["Tiruppur", "Tamil Nadu"],
  ["Gurugram", "Haryana"],
  ["Moradabad", "Uttar Pradesh"],
  ["Jalandhar", "Punjab"],
  ["Bhubaneswar", "Odisha"],
  ["Salem", "Tamil Nadu"],
  ["Warangal", "Telangana"],
  ["Kochi", "Kerala"],
  ["Mangaluru", "Karnataka"],
  ["Cuttack", "Odisha"],
  ["Shimla", "Himachal Pradesh"],
  ["Dehradun", "Uttarakhand"],
  ["Panaji", "Goa"],
  ["Imphal", "Manipur"],
  ["Shillong", "Meghalaya"],
  ["Aizawl", "Mizoram"],
  ["Agartala", "Tripura"],
  ["Kohima", "Nagaland"],
  ["Gangtok", "Sikkim"],
  ["Itanagar", "Arunachal Pradesh"],
  ["Port Blair", "Andaman and Nicobar"],
  ["Puducherry", "Puducherry"],
];

let success = 0;
let failed = 0;

for (const [city, state] of CITIES) {
  try {
    const res = await fetch(`${API}?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`, {
      signal: AbortSignal.timeout(120000),
    });
    const data = await res.json();
    if (data.count > 0) {
      const types = Object.entries(data.types ?? {}).map(([k, v]) => `${k}:${v}`).join(", ");
      console.log(`✅ ${city} — ${data.count} facilities (${types})`);
      success++;
    } else {
      console.log(`⚠️  ${city} — ${data.message || "no data"}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ${city} — ${err.message}`);
    failed++;
  }
}

console.log(`\nDone. ${success} cities seeded, ${failed} failed.`);
