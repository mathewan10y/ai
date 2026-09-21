/**
 * WeatherService: Open-Meteo API integration with 15-minute in-memory caching.
 * Fetches shortwave_radiation (W/m²) and cloud_cover (%) for geographical coordinates.
 */
export class WeatherService {
  constructor() {
    this.cache = new Map(); // key: "lat,lon" -> { data, timestamp }
    this.cacheTtlMs = 15 * 60 * 1000; // 15 minutes
  }

  getCacheKey(latitude, longitude) {
    const lat = Number(latitude || 37.7749).toFixed(2);
    const lon = Number(longitude || -122.4194).toFixed(2);
    return `${lat},${lon}`;
  }

  /**
   * Generates a realistic synthetic daylight & cloud fallback if external API fails
   */
  getFallbackWeather(latitude, longitude) {
    const now = new Date();
    const hour = now.getHours() + (now.getMinutes() / 60);

    // Diurnal solar curve (peak ~13:00)
    let solarPeak = 850; // W/m²
    let radiation = 0;
    if (hour >= 6 && hour <= 19) {
      radiation = Math.max(0, Math.sin(((hour - 6) / 13) * Math.PI) * solarPeak);
    }

    const cloudCover = Math.round(20 + Math.random() * 25);
    const effectiveRadiation = Number((radiation * (1 - cloudCover / 150)).toFixed(1));

    // Next 3 hours forecast
    const hourlyRadiation = [1, 2, 3].map((offset) => {
      const h = (hour + offset) % 24;
      if (h >= 6 && h <= 19) {
        return Number((Math.sin(((h - 6) / 13) * Math.PI) * solarPeak * (1 - cloudCover / 150)).toFixed(1));
      }
      return 0;
    });

    const forecastState = this.calculateForecastState(effectiveRadiation, hourlyRadiation);

    return {
      latitude: Number(latitude || 37.7749),
      longitude: Number(longitude || -122.4194),
      shortwaveRadiation: effectiveRadiation,
      cloudCover: cloudCover,
      solarForecast: forecastState,
      hourlyRadiation: hourlyRadiation,
      isLive: false,
      timestamp: Date.now()
    };
  }

  /**
   * Discretizes next 3 hours of radiation lookahead into forecast categories
   */
  calculateForecastState(currentRadiation, hourlyRadiation) {
    const avgNext3h = hourlyRadiation.reduce((a, b) => a + b, 0) / (hourlyRadiation.length || 1);

    if (currentRadiation < 50 && avgNext3h < 50) {
      return 'FORECAST_NIGHT';
    }

    if (currentRadiation >= 200 && (avgNext3h < 150 || avgNext3h < currentRadiation * 0.55)) {
      return 'FORECAST_DROP';
    }

    if (avgNext3h >= 300 || avgNext3h >= currentRadiation * 0.9) {
      return 'FORECAST_CLEAR';
    }

    return 'FORECAST_CLEAR';
  }

  /**
   * Fetches live telemetry from Open-Meteo API
   */
  async getTelemetry(latitude = 37.7749, longitude = -122.4194) {
    const key = this.getCacheKey(latitude, longitude);
    const cached = this.cache.get(key);

    if (cached && (Date.now() - cached.timestamp < this.cacheTtlMs)) {
      return cached.data;
    }

    try {
      const lat = Number(latitude).toFixed(4);
      const lon = Number(longitude).toFixed(4);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=shortwave_radiation,cloud_cover&hourly=shortwave_radiation,cloud_cover&forecast_days=1`;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'SmartGrid-MARL-Simulator/1.0' },
        signal: AbortSignal.timeout(4000)
      });

      if (!response.ok) {
        throw new Error(`Open-Meteo HTTP ${response.status}`);
      }

      const json = await response.json();
      const currentRadiation = json.current?.shortwave_radiation ?? 450;
      const cloudCover = json.current?.cloud_cover ?? 15;

      // Extract next 3 hours from hourly forecast
      let hourlyRadiation = [];
      if (json.hourly?.shortwave_radiation && json.hourly?.time) {
        const currentIsoHour = new Date().toISOString().slice(0, 13);
        const currentIndex = json.hourly.time.findIndex(t => t.startsWith(currentIsoHour));
        const startIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
        hourlyRadiation = json.hourly.shortwave_radiation.slice(startIndex, startIndex + 3);
      }

      if (hourlyRadiation.length < 3) {
        hourlyRadiation = [currentRadiation * 0.85, currentRadiation * 0.65, 0];
      }

      const solarForecast = this.calculateForecastState(currentRadiation, hourlyRadiation);

      const result = {
        latitude: Number(lat),
        longitude: Number(lon),
        shortwaveRadiation: Number(currentRadiation.toFixed(1)),
        cloudCover: Number(cloudCover.toFixed(0)),
        solarForecast,
        hourlyRadiation,
        isLive: true,
        timestamp: Date.now()
      };

      this.cache.set(key, { data: result, timestamp: Date.now() });
      return result;
    } catch (err) {
      // Fallback gracefully on network error or rate limit
      const fallback = this.getFallbackWeather(latitude, longitude);
      this.cache.set(key, { data: fallback, timestamp: Date.now() });
      return fallback;
    }
  }
}

export const weatherService = new WeatherService();
