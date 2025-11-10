// Креативные статусы для AI-куратора
export const AI_LOADING_PHRASES = [
  "Думаю над ответом...",
  "Анализирую вопрос...",
  "Подбираю лучшие слова...",
  "Обрабатываю данные...",
  "Формулирую ответ...",
  "Ищу решение...",
  "Проверяю информацию...",
  "Составляю ответ...",
  "Немного подумаю...",
  "Анализирую контекст...",
  "Обдумываю детали...",
  "Подготавливаю ответ...",
  "Взвешиваю варианты...",
  "Ищу лучший подход...",
  "Размышляю над вопросом...",
];

/**
 * Получить случайную фразу загрузки
 */
export function getRandomLoadingPhrase(): string {
  const index = Math.floor(Math.random() * AI_LOADING_PHRASES.length);
  return AI_LOADING_PHRASES[index];
}

/**
 * Получить последовательность фраз с интервалами
 * Возвращает массив фраз которые будут показываться каждые N секунд
 */
export function getLoadingPhraseSequence(count: number = 3): string[] {
  const shuffled = [...AI_LOADING_PHRASES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

