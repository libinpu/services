import type { TranslationKey } from './i18n';

export type SeasonalSuggestion = {
  key: 'monsoon' | 'onam' | 'summer';
  titleKey: TranslationKey;
  descKey: TranslationKey;
  /** Matched against category names to deep-link the banner CTA. */
  categoryHints: string[];
};

const SUGGESTIONS: Record<SeasonalSuggestion['key'], SeasonalSuggestion> = {
  monsoon: {
    key: 'monsoon',
    titleKey: 'monsoonBanner',
    descKey: 'monsoonBannerDesc',
    categoryHints: ['electric', 'plumb', 'paint', 'waterproof'],
  },
  onam: {
    key: 'onam',
    titleKey: 'onamBanner',
    descKey: 'onamBannerDesc',
    categoryHints: ['clean', 'paint'],
  },
  summer: {
    key: 'summer',
    titleKey: 'summerBanner',
    descKey: 'summerBannerDesc',
    categoryHints: ['ac', 'air', 'applian', 'electric'],
  },
};

/** Kerala calendar rules: monsoon Jun–Jul, Onam season Aug–Sep, summer Feb–May. */
export function seasonalByMonth(date = new Date()): SeasonalSuggestion {
  const month = date.getMonth() + 1;
  if (month >= 8 && month <= 9) return SUGGESTIONS.onam;
  if (month >= 6 && month <= 7) return SUGGESTIONS.monsoon;
  if (month >= 10 && month <= 11) return SUGGESTIONS.monsoon;
  return SUGGESTIONS.summer;
}

type WeatherResponse = {
  current?: { precipitation?: number; temperature_2m?: number };
};

/**
 * Refines the calendar rule with live conditions from Open-Meteo (keyless,
 * no PII sent beyond coarse coordinates). Falls back to the calendar rule.
 */
export async function seasonalSuggestion(
  coords?: { lat: number; lng: number } | null,
  date = new Date()
): Promise<SeasonalSuggestion> {
  const fallback = seasonalByMonth(date);
  if (!coords) return fallback;
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat.toFixed(2)}` +
      `&longitude=${coords.lng.toFixed(2)}&current=precipitation,temperature_2m`;
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const json = (await res.json()) as WeatherResponse;
    const precipitation = json.current?.precipitation ?? 0;
    const temperature = json.current?.temperature_2m ?? 0;
    if (precipitation >= 1) return SUGGESTIONS.monsoon;
    if (temperature >= 33) return SUGGESTIONS.summer;
    return fallback;
  } catch {
    return fallback;
  }
}
