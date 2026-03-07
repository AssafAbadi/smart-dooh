import { Injectable } from '@nestjs/common';
import { ConfigService } from './config.service';

/**
 * Strictly typed accessor for external API keys. No process.env; all keys come from ConfigService.
 * Use getX() when the integration is optional; use getXOrThrow() when the key is required at first use.
 */
@Injectable()
export class ExternalApiConfigService {
  constructor(private readonly config: ConfigService) {}

  getWeatherApiKey(): string | undefined {
    return (
      this.config.get('OPENWEATHERMAP_API_KEY') ?? this.config.get('WEATHER_API_KEY')
    );
  }

  getWeatherApiKeyOrThrow(): string {
    const key = this.getWeatherApiKey();
    if (key == null || key === '') {
      throw new Error('Weather API key is required (OPENWEATHERMAP_API_KEY or WEATHER_API_KEY)');
    }
    return key;
  }

  getGooglePlacesApiKey(): string | undefined {
    return this.config.get('GOOGLE_PLACES_API_KEY');
  }

  /** Maps Platform key (Geocoding API). Falls back to Places key if not set. */
  getGoogleMapsApiKey(): string | undefined {
    return this.config.get('GOOGLE_MAPS_API_KEY') ?? this.config.get('GOOGLE_PLACES_API_KEY');
  }

  getGooglePlacesApiKeyOrThrow(): string {
    const key = this.getGooglePlacesApiKey();
    if (key == null || key === '') {
      throw new Error('GOOGLE_PLACES_API_KEY is required');
    }
    return key;
  }

  getSerpApiKey(): string | undefined {
    return this.config.get('SERPAPI_API_KEY');
  }

  getSerpApiKeyOrThrow(): string {
    const key = this.getSerpApiKey();
    if (key == null || key === '') {
      throw new Error('SERPAPI_API_KEY is required');
    }
    return key;
  }

  getGeminiApiKey(): string | undefined {
    return this.config.get('GEMINI_API_KEY');
  }

  getGeminiApiKeyOrThrow(): string {
    const key = this.getGeminiApiKey();
    if (key == null || key === '') {
      throw new Error('GEMINI_API_KEY is required');
    }
    return key;
  }

  getOpenAiApiKey(): string | undefined {
    return this.config.get('OPENAI_API_KEY');
  }

  getOpenAiApiKeyOrThrow(): string {
    const key = this.getOpenAiApiKey();
    if (key == null || key === '') {
      throw new Error('OPENAI_API_KEY is required');
    }
    return key;
  }

  getAdminApiKey(): string | undefined {
    return this.config.get('ADMIN_API_KEY');
  }

  getStripeSecretKey(): string | undefined {
    return this.config.get('STRIPE_SECRET_KEY');
  }

  getStripeSecretKeyOrThrow(): string {
    const key = this.getStripeSecretKey();
    if (key == null || key === '') {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    return key;
  }

  getStripeWebhookSecret(): string | undefined {
    return this.config.get('STRIPE_WEBHOOK_SECRET');
  }

  getStripeWebhookSecretOrThrow(): string {
    const key = this.getStripeWebhookSecret();
    if (key == null || key === '') {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }
    return key;
  }

  getTranzilaTerminal(): string | undefined {
    return this.config.get('TRANZILA_TERMINAL');
  }
}
