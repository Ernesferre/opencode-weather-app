import type { City } from "../types/City.ts";
import type { TemperatureUnit } from "../types/Weather.ts";

export function cityLabel(city: City): string {
  return city.country ? `${city.name}, ${city.country}` : city.name;
}

export function unitSymbol(unit: TemperatureUnit): string {
  return unit === "celsius" ? "°C" : "°F";
}

export function formatTemperature(value: number, unit: TemperatureUnit): string {
  return `${value.toFixed(1)} ${unitSymbol(unit)}`;
}

export function weatherDescription(code: number): string {
  if (code === 0) return "Despejado";
  if (code === 1) return "Mayormente despejado";
  if (code === 2) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if ([45, 48].includes(code)) return "Niebla";
  if ([51, 53, 55].includes(code)) return "Llovizna";
  if ([56, 57].includes(code)) return "Llovizna helada";
  if ([61, 63, 65].includes(code)) return "Lluvia";
  if ([66, 67].includes(code)) return "Lluvia helada";
  if ([71, 73, 75, 77].includes(code)) return "Nieve";
  if ([80, 81, 82].includes(code)) return "Chubascos";
  if ([85, 86].includes(code)) return "Chubascos de nieve";
  if (code === 95) return "Tormenta";
  if ([96, 99].includes(code)) return "Tormenta con granizo";
  return "Estado desconocido";
}
