export type TemperatureUnit = "celsius" | "fahrenheit";

export interface ForecastDay {
  date: string;
  minimum: number;
  maximum: number;
  weatherCode: number;
  precipitationProbability: number;
}
