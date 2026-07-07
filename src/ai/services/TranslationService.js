/**
 * TranslationService — Translates messages between languages.
 * Preserves medical accuracy during translation.
 */

class TranslationService {
  constructor(aiRouter) {
    this.aiRouter = aiRouter;
  }

  /**
   * Translate text to target language
   */
  async translate(text, targetLang, options = {}) {
    return this.aiRouter.routeWithProvider('translate', text, {
      targetLang,
      ...options,
    });
  }

  /**
   * Detect if patient message needs translation
   */
  static detectLanguage(text) {
    const hausaIndicators = [
      /na\s+gode/i, /yaya/i, /ina\s+lahiya/i, /to\b/i, /ba\s+shi/i,
      /da\s+kyau/i, /allah/i, /insha/i, /sannu/i, /naf/i,
      /ina\s+jin/i, /ba\s+ni/i, /na\s+so/i, /ki\b/i, /ka\b/i,
    ];

    const hausaScore = hausaIndicators.filter(r => r.test(text)).length;
    if (hausaScore >= 2) return 'ha';

    // Check for other common Nigerian languages
    if (/\b(biko|nno|kedu|daalu|imela)\b/i.test(text)) return 'ig';
    if (/\b(bawo|e\\xe0|o d\\xe0|a d\\xe1|p\\xe9l\\xe9|o\xf9n k\\xe1)\b/i.test(text)) return 'yo';

    return 'en';
  }

  /**
   * Get supported languages
   */
  static getSupportedLanguages() {
    return [
      { code: 'en', name: 'English' },
      { code: 'ha', name: 'Hausa' },
      { code: 'yo', name: 'Yoruba' },
      { code: 'ig', name: 'Igbo' },
      { code: 'fr', name: 'French' },
      { code: 'ar', name: 'Arabic' },
      { code: 'sw', name: 'Swahili' },
    ];
  }
}

module.exports = TranslationService;
