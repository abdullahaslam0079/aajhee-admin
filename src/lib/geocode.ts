export type AddressSuggestion = {
  display: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  latitude: string;
  longitude: string;
};

type NominatimAddress = {
  road?: string;
  pedestrian?: string;
  footway?: string;
  house_number?: string;
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
};

type NominatimHit = {
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
};

function mapHit(hit: NominatimHit): AddressSuggestion {
  const addr = hit.address || {};
  return {
    display: hit.display_name,
    street: addr.road || addr.pedestrian || addr.footway || "",
    houseNumber: addr.house_number || "",
    postalCode: addr.postcode || "",
    city: addr.city || addr.town || addr.village || addr.municipality || "",
    latitude: Number(hit.lat).toFixed(6),
    longitude: Number(hit.lon).toFixed(6),
  };
}

export async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 5) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "de");
  url.searchParams.set("limit", "6");
  url.searchParams.set("q", q);
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": "AajheeAdminWeb/1.0" },
  });
  if (!res.ok) throw new Error("Address lookup failed");
  const hits = (await res.json()) as NominatimHit[];
  return hits.map(mapHit);
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<AddressSuggestion | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": "AajheeAdminWeb/1.0" },
  });
  if (!res.ok) return null;
  const hit = (await res.json()) as NominatimHit & { error?: string };
  if (hit.error || !hit.lat) return null;
  return mapHit(hit);
}
