/**
 * Language Hook for Traffic Dashboard
 * Supports Russian and Kazakh languages
 */

import { useState, useEffect } from 'react';
import { Language, TranslationKey, getTranslation } from '@/i18n/translations';

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => {
    // Load from localStorage or default to Russian
    const saved = localStorage.getItem('traffic_language');
    return (saved === 'kz' ? 'kz' : 'ru') as Language;
  });

  useEffect(() => {
    // Save to localStorage whenever language changes
    localStorage.setItem('traffic_language', language);
  }, [language]);

  const t = (key: TranslationKey): string => {
    return getTranslation(language, key);
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ru' ? 'kz' : 'ru');
  };

  return { language, setLanguage, t, toggleLanguage };
}
