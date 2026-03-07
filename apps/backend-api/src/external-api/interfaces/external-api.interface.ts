export interface PoiResult {
  placeId: string;
  name: string;
  types: string[];
  category: string;
  lat: number;
  lng: number;
  vicinity?: string;
}

export interface WeatherResult {
  tempCelsius: number;
  condition: string;
  code?: number;
}

export interface IPlacesApiService {
  getNearbyPois(lat: number, lng: number, geohash: string): Promise<PoiResult[]>;
}

export interface IWeatherApiService {
  getWeather(lat: number, lng: number, geohash: string): Promise<WeatherResult | null>;
}
