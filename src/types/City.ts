export interface City {
  id: number;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export function isCity(value: unknown): value is City {
  if (!value || typeof value !== "object") return false;
  const city = value as Record<string, unknown>;
  return (
    Number.isInteger(city.id) &&
    typeof city.name === "string" && city.name.length > 0 &&
    typeof city.country === "string" &&
    typeof city.latitude === "number" && Number.isFinite(city.latitude) && Math.abs(city.latitude) <= 90 &&
    typeof city.longitude === "number" && Number.isFinite(city.longitude) && Math.abs(city.longitude) <= 180
  );
}
