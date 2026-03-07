/**
 * Glossary for brand and fixed terms in translations.
 * Ensures consistent translation (e.g. "Happy Hour" kept or translated once).
 */
export const CREATIVE_GLOSSARY: Record<string, Record<string, string>> = {
  en: {
    'Happy Hour': 'Happy Hour',
    'הנחה': 'Discount',
  },
  he: {
    'Happy Hour': 'שעת שמחה',
    'Discount': 'הנחה',
  },
  ar: {
    'Happy Hour': 'ساعة سعيدة',
    'Discount': 'خصم',
  },
};

const DEFAULT_LANG = 'en';

export function applyGlossary(text: string, targetLang: string): string {
  const glossary = CREATIVE_GLOSSARY[targetLang] ?? CREATIVE_GLOSSARY[DEFAULT_LANG];
  let out = text;
  for (const [term, translation] of Object.entries(glossary)) {
    out = out.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), translation);
  }
  return out;
}

export function getGlossaryTermsForPrompt(): string[] {
  const terms = new Set<string>();
  for (const lang of Object.values(CREATIVE_GLOSSARY)) {
    for (const key of Object.keys(lang)) terms.add(key);
  }
  return Array.from(terms);
}
