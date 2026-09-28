/**
 * Launch / coverage cities for Aajhee.
 * Edit ENABLED_CITIES to add Karachi, Islamabad, etc.
 */
export type LaunchCity = {
  name: string;
  latitude: number;
  longitude: number;
};

export const ENABLED_CITIES: LaunchCity[] = [
  { name: "Lahore", latitude: 31.5204, longitude: 74.3587 },
];

export function primaryCity(): LaunchCity {
  return ENABLED_CITIES[0];
}

export function primaryCityName(): string {
  return primaryCity().name;
}

export function sameDayLabel(city?: string | null): string {
  const cleaned = (city || "").trim();
  if (cleaned) return `Same-day delivery in ${cleaned}`;
  return "Same-day delivery";
}
