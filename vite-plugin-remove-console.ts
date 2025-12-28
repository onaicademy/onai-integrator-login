// ============================================
// Vite Plugin - Удаление console.log в production
// ============================================
// Удаляет все console.log, console.info, console.warn в production
// console.error остается для отладки

import { Plugin } from 'vite';

export function removeConsole(): Plugin {
  return {
    name: 'remove-console',
    enforce: 'post',
    transform(code, id) {
      // Пропускаем node_modules
      if (id.includes('node_modules')) {
        return null;
      }

      // Применяем только к .ts, .tsx, .js, .jsx файлам
      if (!/\.(ts|tsx|js|jsx)$/.test(id)) {
        return null;
      }

      // Удаляем console.log, console.info, console.warn
      // console.error оставляем для production
      const transformed = code
        .replace(/console\.log\(/g, '(() => {}).__LOG__(')
        .replace(/console\.info\(/g, '(() => {}).__INFO__(')
        .replace(/console\.warn\(/g, '(() => {}).__WARN__(')
        .replace(/console\.debug\(/g, '(() => {}).__DEBUG__(');

      return {
        code: transformed,
        map: null,
      };
    },
  };
}
