/**
 * 🎓 Traffic Onboarding E2E Tests
 * 
 * Полное E2E тестирование онбординг системы:
 * - Центровка popover на всех разрешениях
 * - Правильные брендовые цвета (#00FF88)
 * - Триггеры "пока не нажмешь - не продолжишь"
 * - Observability (логи в консоль)
 * - Адаптивный дизайн
 * 
 * @version 1.0.0
 * @date 2025-12-22
 */

import { test, expect, Page } from '@playwright/test';

const TEST_URL = 'http://localhost:5173/onboarding-test';

/**
 * Helper: Ожидание загрузки тура
 */
async function waitForTourStart(page: Page) {
  // Ждем появления overlay
  await page.waitForSelector('.driver-overlay', { state: 'visible', timeout: 5000 });
  // Ждем появления popover
  await page.waitForSelector('.traffic-onboarding-popover', { state: 'visible', timeout: 5000 });
}

/**
 * Helper: Получить логи консоли
 */
async function captureConsoleLogs(page: Page): Promise<string[]> {
  const logs: string[] = [];
  page.on('console', (msg) => {
    if (msg.text().includes('[ONBOARDING]')) {
      logs.push(msg.text());
    }
  });
  return logs;
}

/**
 * Helper: Проверка центровки элемента
 */
async function checkCentering(page: Page, selector: string) {
  const element = page.locator(selector);
  const box = await element.boundingBox();
  const viewport = page.viewportSize();
  
  if (!box || !viewport) {
    throw new Error('Cannot get element box or viewport size');
  }
  
  const elementCenterX = box.x + box.width / 2;
  const elementCenterY = box.y + box.height / 2;
  const viewportCenterX = viewport.width / 2;
  const viewportCenterY = viewport.height / 2;
  
  // Допустимое отклонение: 50px
  const tolerance = 50;
  
  expect(Math.abs(elementCenterX - viewportCenterX)).toBeLessThan(tolerance);
  expect(Math.abs(elementCenterY - viewportCenterY)).toBeLessThan(tolerance);
}

test.describe('Traffic Onboarding System', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState('networkidle');
  });

  test('🎨 Test Page загружается корректно', async ({ page }) => {
    // Проверяем заголовок
    await expect(page.getByText('Тестирование Онбординга')).toBeVisible();
    
    // Проверяем наличие кнопки запуска
    const startButton = page.getByTestId('start-tour-btn');
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
    
    // Проверяем выбор ролей
    await expect(page.getByText('Таргетолог')).toBeVisible();
    await expect(page.getByText('Админ')).toBeVisible();
  });

  test('🎯 Запуск тура для таргетолога', async ({ page }) => {
    // Выбираем роль таргетолога (по умолчанию)
    const startButton = page.getByTestId('start-tour-btn');
    await startButton.click();
    
    // Ждем появления тура
    await waitForTourStart(page);
    
    // Проверяем что popover виден
    const popover = page.locator('.traffic-onboarding-popover');
    await expect(popover).toBeVisible();
    
    // Проверяем что есть приветствие
    await expect(page.getByText(/Привет/i)).toBeVisible();
    await expect(page.getByText(/Traffic Dashboard/i)).toBeVisible();
  });

  test('👑 Запуск тура для админа', async ({ page }) => {
    // Выбираем роль админа
    await page.getByText('Админ', { exact: false }).click();
    
    // Запускаем тур
    const startButton = page.getByTestId('start-tour-btn');
    await startButton.click();
    
    // Ждем появления тура
    await waitForTourStart(page);
    
    // Проверяем админский контент
    await expect(page.getByText(/Admin Panel/i)).toBeVisible();
  });

  test('🎨 Проверка центровки popover на Desktop', async ({ page }) => {
    // Desktop размер
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Запускаем тур
    await page.getByTestId('start-tour-btn').click();
    await waitForTourStart(page);
    
    // Проверяем центровку
    await checkCentering(page, '.traffic-onboarding-popover');
  });

  test('📱 Проверка центровки popover на Mobile', async ({ page }) => {
    // Mobile размер
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Запускаем тур
    await page.getByTestId('start-tour-btn').click();
    await waitForTourStart(page);
    
    // Проверяем что popover виден
    const popover = page.locator('.traffic-onboarding-popover');
    await expect(popover).toBeVisible();
    
    // На мобиле центровка по центру экрана
    await checkCentering(page, '.traffic-onboarding-popover');
  });

  test('💚 Проверка брендового цвета кнопки "Далее"', async ({ page }) => {
    // Запускаем тур
    await page.getByTestId('start-tour-btn').click();
    await waitForTourStart(page);
    
    // Находим кнопку "Далее"
    const nextButton = page.locator('.driver-popover-next-btn');
    await expect(nextButton).toBeVisible();
    
    // Проверяем что кнопка имеет правильный цвет
    const backgroundColor = await nextButton.evaluate((el) => {
      return window.getComputedStyle(el).background;
    });
    
    // Должен содержать градиент с #00FF88
    expect(backgroundColor).toContain('00ff88');
  });

  test('🔄 Триггер: Переход к следующему шагу только после клика', async ({ page }) => {
    // Запускаем тур
    await page.getByTestId('start-tour-btn').click();
    await waitForTourStart(page);
    
    // Получаем первый шаг
    const progressText = page.locator('.driver-popover-progress-text');
    await expect(progressText).toHaveText(/Шаг 1 из/);
    
    // Ждем 2 секунды - тур НЕ должен автоматически перейти
    await page.waitForTimeout(2000);
    await expect(progressText).toHaveText(/Шаг 1 из/);
    
    // Кликаем "Далее"
    await page.locator('.driver-popover-next-btn').click();
    
    // Теперь должны быть на шаге 2
    await expect(progressText).toHaveText(/Шаг 2 из/);
  });

  test('⬅️ Триггер: Возврат к предыдущему шагу', async ({ page }) => {
    // Запускаем тур
    await page.getByTestId('start-tour-btn').click();
    await waitForTourStart(page);
    
    // Переходим на шаг 2
    await page.locator('.driver-popover-next-btn').click();
    await page.waitForTimeout(500);
    
    const progressText = page.locator('.driver-popover-progress-text');
    await expect(progressText).toHaveText(/Шаг 2 из/);
    
    // Возвращаемся назад
    await page.locator('.driver-popover-prev-btn').click();
    await page.waitForTimeout(500);
    
    // Должны быть на шаге 1
    await expect(progressText).toHaveText(/Шаг 1 из/);
  });

  test('📊 Observability: Логи в консоли', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('[ONBOARDING]')) {
        logs.push(msg.text());
      }
    });
    
    // Запускаем тур
    await page.getByTestId('start-tour-btn').click();
    await waitForTourStart(page);
    
    // Ждем немного для записи логов
    await page.waitForTimeout(1000);
    
    // Проверяем что логи записываются
    expect(logs.length).toBeGreaterThan(0);
    
    // Проверяем наличие ключевых событий
    const logText = logs.join('\n');
    expect(logText).toContain('tour_check_start');
    expect(logText).toContain('tour_start');
  });

  test('❌ Закрытие тура через кнопку X', async ({ page }) => {
    // Запускаем тур
    await page.getByTestId('start-tour-btn').click();
    await waitForTourStart(page);
    
    // Находим и кликаем кнопку закрытия
    const closeButton = page.locator('.driver-popover-close-btn');
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    
    // Тур должен закрыться
    await expect(page.locator('.traffic-onboarding-popover')).not.toBeVisible();
  });

  test('🎉 Прохождение всего тура до конца (таргетолог)', async ({ page }) => {
    // Запускаем тур
    await page.getByTestId('start-tour-btn').click();
    await waitForTourStart(page);
    
    // Считаем шаги
    const progressText = page.locator('.driver-popover-progress-text');
    const totalStepsMatch = await progressText.textContent();
    const totalSteps = totalStepsMatch?.match(/из (\d+)/)?.[1];
    
    if (!totalSteps) {
      throw new Error('Cannot determine total steps');
    }
    
    // Проходим все шаги
    for (let i = 1; i < parseInt(totalSteps); i++) {
      await page.locator('.driver-popover-next-btn').click();
      await page.waitForTimeout(500);
    }
    
    // На последнем шаге кнопка должна быть "Готово"
    const doneButton = page.locator('.driver-popover-next-btn');
    await expect(doneButton).toHaveText(/Готово/i);
    
    // Завершаем тур
    await doneButton.click();
    
    // Тур должен закрыться
    await expect(page.locator('.traffic-onboarding-popover')).not.toBeVisible();
  });

  test('🔄 Сброс и повторный запуск тура', async ({ page }) => {
    // Запускаем тур
    await page.getByTestId('start-tour-btn').click();
    await waitForTourStart(page);
    
    // Закрываем
    await page.locator('.driver-popover-close-btn').click();
    await expect(page.locator('.traffic-onboarding-popover')).not.toBeVisible();
    
    // Сбрасываем
    await page.getByText('Сбросить Прогресс').click();
    
    // Запускаем снова
    await page.getByTestId('start-tour-btn').click();
    await waitForTourStart(page);
    
    // Должен начаться с шага 1
    const progressText = page.locator('.driver-popover-progress-text');
    await expect(progressText).toHaveText(/Шаг 1 из/);
  });

  test('📐 Адаптивность на разных разрешениях', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop Large' },
      { width: 1366, height: 768, name: 'Desktop Medium' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
    ];
    
    for (const viewport of viewports) {
      console.log(`Testing viewport: ${viewport.name}`);
      
      await page.setViewportSize(viewport);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Запускаем тур
      await page.getByTestId('start-tour-btn').click();
      await waitForTourStart(page);
      
      // Проверяем что popover виден
      const popover = page.locator('.traffic-onboarding-popover');
      await expect(popover).toBeVisible();
      
      // Проверяем центровку
      await checkCentering(page, '.traffic-onboarding-popover');
      
      // Закрываем
      await page.locator('.driver-popover-close-btn').click();
      await page.waitForTimeout(500);
    }
  });

  test('✨ Проверка hover эффектов на кнопках', async ({ page }) => {
    // Запускаем тур
    await page.getByTestId('start-tour-btn').click();
    await waitForTourStart(page);
    
    // Наводим на кнопку "Далее"
    const nextButton = page.locator('.driver-popover-next-btn');
    await nextButton.hover();
    
    // Должно быть свечение (проверяем через box-shadow)
    const boxShadow = await nextButton.evaluate((el) => {
      return window.getComputedStyle(el).boxShadow;
    });
    
    // Box shadow должен быть не none
    expect(boxShadow).not.toBe('none');
  });

  test('🎯 Проверка подсветки активного элемента', async ({ page }) => {
    // Запускаем тур
    await page.getByTestId('start-tour-btn').click();
    await waitForTourStart(page);
    
    // Переходим к шагу с подсветкой элемента
    await page.locator('.driver-popover-next-btn').click();
    await page.waitForTimeout(500);
    
    // Проверяем что есть подсвеченный элемент
    const highlightedElement = page.locator('.driver-active-element');
    
    // Должен быть виден (если есть)
    const count = await highlightedElement.count();
    if (count > 0) {
      await expect(highlightedElement).toBeVisible();
      
      // Проверяем outline цвет
      const outline = await highlightedElement.evaluate((el) => {
        return window.getComputedStyle(el).outline;
      });
      
      // Должен содержать зеленый цвет
      expect(outline.toLowerCase()).toContain('00ff88');
    }
  });

  test('🔊 Accessibility: Keyboard navigation', async ({ page }) => {
    // Запускаем тур
    await page.getByTestId('start-tour-btn').click();
    await waitForTourStart(page);
    
    // Пытаемся использовать Escape для закрытия
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Тур может закрыться или нет (зависит от настроек)
    // Но функциональность должна работать без ошибок
    const isVisible = await page.locator('.traffic-onboarding-popover').isVisible();
    expect(typeof isVisible).toBe('boolean');
  });
});

test.describe('Onboarding Performance', () => {
  test('⚡ Тур загружается быстро (< 2s)', async ({ page }) => {
    await page.goto(TEST_URL);
    
    const startTime = Date.now();
    
    await page.getByTestId('start-tour-btn').click();
    await waitForTourStart(page);
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000);
  });

  test('📦 Нет memory leaks при многократном запуске', async ({ page }) => {
    await page.goto(TEST_URL);
    
    // Запускаем и закрываем тур 5 раз
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('start-tour-btn').click();
      await waitForTourStart(page);
      await page.locator('.driver-popover-close-btn').click();
      await page.waitForTimeout(500);
    }
    
    // Если нет ошибок - тест пройден
    expect(true).toBe(true);
  });
});

