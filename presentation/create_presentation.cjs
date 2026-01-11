/**
 * VIBE CODING STARTER - Module 1 Presentation Generator
 * Brand: CYBER-ARCHITECTURE v3.0
 * Using pptxgenjs
 */

const pptxgen = require('pptxgenjs');
const path = require('path');

// ============================================================================
// BRAND COLORS (hex without #)
// ============================================================================
const COLORS = {
  CYBER_ACID: '00FF88',      // CTA, accents
  CYBER_VOID: '030303',      // Background
  CYBER_SURFACE: '0A0A0A',   // Cards
  SIGNAL_RED: 'FF3366',      // Warnings
  HOLO_WHITE: 'FFFFFF',      // Main text
  TECH_GRAY: '9CA3AF',       // Secondary text
  ACID_15: '0D2B1B',         // ~15% green on black
  ACID_30: '154D2F',         // ~30% green on black
  RED_10: '2B0D15',          // ~10% red on black
  GREEN_10: '0D2B1B',        // ~10% green on black
  SURFACE_90: '0C0C0C',      // Surface
  BORDER_SUBTLE: '202020',   // Subtle border
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================
const FONTS = {
  H1: { fontFace: 'Arial Black', fontSize: 56, bold: true, color: COLORS.HOLO_WHITE },
  H1_LARGE: { fontFace: 'Arial Black', fontSize: 96, bold: true, color: COLORS.HOLO_WHITE },
  H2: { fontFace: 'Arial Black', fontSize: 48, bold: true, color: COLORS.HOLO_WHITE },
  BODY: { fontFace: 'Arial', fontSize: 24, color: COLORS.HOLO_WHITE },
  BODY_BOLD: { fontFace: 'Arial', fontSize: 24, bold: true, color: COLORS.HOLO_WHITE },
  BODY_SMALL: { fontFace: 'Arial', fontSize: 20, color: COLORS.TECH_GRAY },
  CODE: { fontFace: 'Courier New', fontSize: 18, color: COLORS.CYBER_ACID },
  BADGE: { fontFace: 'Courier New', fontSize: 18, bold: true, color: COLORS.CYBER_VOID },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function addBadge(slide, text, x = 10.5, y = 0.4) {
  slide.addShape('roundRect', {
    x: x, y: y, w: 1.8, h: 0.45,
    fill: { color: COLORS.CYBER_ACID },
    rectRadius: 0.1,
  });
  slide.addText(text, {
    x: x, y: y, w: 1.8, h: 0.45,
    fontFace: 'Courier New', fontSize: 16, bold: true,
    color: COLORS.CYBER_VOID,
    align: 'center', valign: 'middle',
  });
}

function addFooter(slide, text = 'VIBE CODING STARTER • МОДУЛЬ 1') {
  slide.addText(text, {
    x: 0.5, y: 6.9, w: 6, h: 0.3,
    fontFace: 'Courier New', fontSize: 12,
    color: COLORS.TECH_GRAY,
  });
}

function addCard(slide, x, y, w, h, options = {}) {
  const {
    fill = COLORS.SURFACE_90,
    border = COLORS.BORDER_SUBTLE,
    borderWidth = 1,
    radius = 0.15,
  } = options;

  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: fill },
    line: { color: border, width: borderWidth },
    rectRadius: radius,
  });
}

function addHighlightedCard(slide, x, y, w, h) {
  addCard(slide, x, y, w, h, {
    fill: COLORS.ACID_15,
    border: COLORS.ACID_30,
    borderWidth: 2,
  });
}

function addNumberIndicator(slide, x, y, number) {
  // Background
  slide.addShape('roundRect', {
    x, y, w: 0.7, h: 0.7,
    fill: { color: COLORS.ACID_15 },
    line: { color: COLORS.ACID_30, width: 1 },
    rectRadius: 0.1,
  });
  // Number
  slide.addText(String(number), {
    x, y, w: 0.7, h: 0.7,
    fontFace: 'Arial Black', fontSize: 32, bold: true,
    color: COLORS.CYBER_ACID,
    align: 'center', valign: 'middle',
  });
}

function addStepCircle(slide, x, y, number, size = 0.5) {
  slide.addShape('ellipse', {
    x, y, w: size, h: size,
    fill: { color: COLORS.CYBER_ACID },
  });
  slide.addText(String(number), {
    x, y, w: size, h: size,
    fontFace: 'Arial Black', fontSize: 20, bold: true,
    color: COLORS.CYBER_VOID,
    align: 'center', valign: 'middle',
  });
}

function addCheckbox(slide, x, y, size = 0.35) {
  slide.addShape('roundRect', {
    x, y, w: size, h: size,
    fill: { color: COLORS.CYBER_VOID },
    line: { color: COLORS.CYBER_ACID, width: 2 },
    rectRadius: 0.05,
  });
  slide.addText('+', {
    x, y, w: size, h: size,
    fontFace: 'Arial', fontSize: 16, bold: true,
    color: COLORS.CYBER_ACID,
    align: 'center', valign: 'middle',
  });
}

function addLeftAccent(slide, x, y, h, color = COLORS.CYBER_ACID) {
  slide.addShape('rect', {
    x, y, w: 0.04, h,
    fill: { color },
  });
}

// ============================================================================
// SLIDE CREATORS
// ============================================================================

function createSlide1Title(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  // Subtitle
  slide.addText('VIBE CODING STARTER', {
    x: 0, y: 1.8, w: '100%', h: 0.5,
    fontFace: 'Courier New', fontSize: 22,
    color: COLORS.CYBER_ACID,
    align: 'center',
  });

  // Main title
  slide.addText('БЫСТРЫЙ', {
    x: 0, y: 2.5, w: '100%', h: 1,
    fontFace: 'Arial Black', fontSize: 96, bold: true,
    color: COLORS.HOLO_WHITE,
    align: 'center',
  });

  slide.addText('СТАРТ', {
    x: 0, y: 3.4, w: '100%', h: 1,
    fontFace: 'Arial Black', fontSize: 96, bold: true,
    color: COLORS.HOLO_WHITE,
    align: 'center',
  });

  // Tagline
  slide.addText('От нуля до первого проекта за 4 часа', {
    x: 0, y: 4.6, w: '100%', h: 0.5,
    fontFace: 'Arial', fontSize: 28,
    color: COLORS.TECH_GRAY,
    align: 'center',
  });

  // Accent line
  slide.addShape('rect', {
    x: 5.4, y: 5.3, w: 2.5, h: 0.04,
    fill: { color: COLORS.CYBER_ACID },
  });
}

function createSlide2Overview(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  // Title
  slide.addText('ЧТО ВАС ЖДЁТ В МОДУЛЕ', {
    x: 0.5, y: 0.4, w: 10, h: 0.8,
    ...FONTS.H1,
  });

  // Stats cards
  const stats = [
    { num: '6', title: 'Уроков', desc: 'От основ до первого проекта' },
    { num: '~4ч', title: 'Часа контента', desc: 'Концентрированные знания' },
    { num: '1', title: 'Готовый проект', desc: 'Калькулятор в портфолио' },
  ];

  stats.forEach((stat, i) => {
    const y = 1.5 + i * 1.3;
    addCard(slide, 0.5, y, 5.5, 1.1);
    addNumberIndicator(slide, 0.7, y + 0.2, stat.num);

    slide.addText(stat.title, {
      x: 1.6, y: y + 0.15, w: 4, h: 0.4,
      fontFace: 'Arial', fontSize: 24, bold: true,
      color: COLORS.HOLO_WHITE,
    });

    slide.addText(stat.desc, {
      x: 1.6, y: y + 0.55, w: 4, h: 0.35,
      fontFace: 'Arial', fontSize: 18,
      color: COLORS.TECH_GRAY,
    });
  });

  // Result card
  addHighlightedCard(slide, 7, 1.5, 5.5, 2.8);

  slide.addText('РЕЗУЛЬТАТ МОДУЛЯ', {
    x: 7.3, y: 1.7, w: 5, h: 0.4,
    fontFace: 'Courier New', fontSize: 16,
    color: COLORS.CYBER_ACID,
  });

  slide.addText('Базовые навыки', {
    x: 7.3, y: 2.3, w: 5, h: 0.5,
    fontFace: 'Arial', fontSize: 26, bold: true,
    color: COLORS.CYBER_ACID,
  });

  slide.addText('AI-программирования', {
    x: 7.3, y: 2.8, w: 5, h: 0.5,
    fontFace: 'Arial', fontSize: 26, bold: true,
    color: COLORS.CYBER_ACID,
  });

  slide.addText('и первый работающий проект', {
    x: 7.3, y: 3.4, w: 5, h: 0.4,
    fontFace: 'Arial', fontSize: 22,
    color: COLORS.HOLO_WHITE,
  });

  addFooter(slide);
}

function createSlide3Program(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  // Title
  slide.addText('ПРОГРАММА МОДУЛЯ', {
    x: 0.5, y: 0.4, w: 10, h: 0.8,
    ...FONTS.H1,
  });

  // Program items
  const lessons = [
    { num: '1.1', title: 'Революция в программировании', time: 'до 20 мин', highlight: false },
    { num: '1.2', title: 'Установка за 15 минут', time: 'до 30 мин', highlight: false },
    { num: '1.3', title: 'Git — твоя страховка', time: 'до 40 мин', highlight: false },
    { num: '1.4', title: 'Анатомия промпта', time: 'до 20 мин', highlight: false },
    { num: '1.5', title: 'Первый проект — Калькулятор', time: 'до 60 мин', highlight: true },
    { num: '1.6', title: 'Что дальше + Бонус', time: 'до 20 мин', highlight: false },
  ];

  lessons.forEach((lesson, i) => {
    const y = 1.4 + i * 0.8;

    if (lesson.highlight) {
      addHighlightedCard(slide, 0.5, y, 11, 0.7);
    } else {
      addCard(slide, 0.5, y, 11, 0.7);
    }

    addLeftAccent(slide, 0.5, y, 0.7);

    slide.addText(lesson.num, {
      x: 0.7, y: y + 0.18, w: 0.8, h: 0.35,
      fontFace: 'Courier New', fontSize: 20, bold: true,
      color: COLORS.CYBER_ACID,
    });

    slide.addText(lesson.title, {
      x: 1.6, y: y + 0.18, w: 7, h: 0.35,
      fontFace: 'Arial', fontSize: 22,
      color: COLORS.HOLO_WHITE,
    });

    slide.addText(lesson.time, {
      x: 9.5, y: y + 0.18, w: 1.8, h: 0.35,
      fontFace: 'Courier New', fontSize: 18,
      color: lesson.highlight ? COLORS.CYBER_ACID : COLORS.TECH_GRAY,
      align: 'right',
    });
  });

  addFooter(slide);

  slide.addText('ИТОГО: ~4 ЧАСА', {
    x: 9, y: 6.9, w: 3.5, h: 0.3,
    fontFace: 'Courier New', fontSize: 14,
    color: COLORS.CYBER_ACID,
    align: 'right',
  });
}

function createSlide4Lesson11(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addBadge(slide, 'УРОК 1.1');

  slide.addText('ДО 20 МИНУТ', {
    x: 0.5, y: 0.4, w: 3, h: 0.4,
    fontFace: 'Courier New', fontSize: 16,
    color: COLORS.CYBER_ACID,
  });

  slide.addText('ЧТО ТАКОЕ VIBE CODING', {
    x: 0.5, y: 0.8, w: 10, h: 0.7,
    ...FONTS.H2,
  });

  // Left column
  slide.addText('Вы узнаете:', {
    x: 0.5, y: 1.7, w: 4, h: 0.4,
    fontFace: 'Arial', fontSize: 22,
    color: COLORS.TECH_GRAY,
  });

  const checklist = [
    'Определение: AI-парное программирование',
    'Почему это работает сейчас',
    'Демонстрация на примере',
    'Отличие от классического',
  ];

  checklist.forEach((item, i) => {
    const y = 2.2 + i * 0.6;
    addCheckbox(slide, 0.5, y);
    slide.addText(item, {
      x: 1.0, y: y, w: 5, h: 0.4,
      fontFace: 'Arial', fontSize: 20,
      color: COLORS.HOLO_WHITE,
    });
  });

  // Right column - Formula card
  addCard(slide, 7, 1.7, 5.5, 4.2, { border: COLORS.ACID_30 });

  slide.addText('ГЛАВНАЯ ФОРМУЛА', {
    x: 7.3, y: 1.9, w: 5, h: 0.4,
    fontFace: 'Courier New', fontSize: 16,
    color: COLORS.CYBER_ACID,
  });

  const formulaItems = [
    { text: 'ИДЕЯ', color: COLORS.HOLO_WHITE },
    { text: '+', color: COLORS.CYBER_ACID },
    { text: 'КОНТЕКСТ', color: COLORS.HOLO_WHITE },
    { text: '+', color: COLORS.CYBER_ACID },
    { text: 'AI', color: COLORS.HOLO_WHITE },
  ];

  formulaItems.forEach((item, i) => {
    slide.addText(item.text, {
      x: 8, y: 2.5 + i * 0.45, w: 4, h: 0.4,
      fontFace: 'Arial Black', fontSize: item.text === '+' ? 22 : 26, bold: true,
      color: item.color,
      align: 'center',
    });
  });

  // Divider
  slide.addShape('rect', {
    x: 8, y: 4.8, w: 4, h: 0.03,
    fill: { color: COLORS.HOLO_WHITE },
  });

  slide.addText('= ЧИСТЫЙ КОД', {
    x: 8, y: 5.1, w: 4, h: 0.5,
    fontFace: 'Arial Black', fontSize: 24, bold: true,
    color: COLORS.CYBER_ACID,
    align: 'center',
  });

  addFooter(slide);
}

function createSlide5Lesson12(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addBadge(slide, 'УРОК 1.2');

  slide.addText('ДО 30 МИНУТ', {
    x: 0.5, y: 0.4, w: 3, h: 0.4,
    fontFace: 'Courier New', fontSize: 16,
    color: COLORS.CYBER_ACID,
  });

  slide.addText('УСТАНОВКА ОКРУЖЕНИЯ', {
    x: 0.5, y: 0.8, w: 10, h: 0.7,
    ...FONTS.H2,
  });

  // Left column
  slide.addText('Что установим:', {
    x: 0.5, y: 1.7, w: 4, h: 0.4,
    fontFace: 'Arial', fontSize: 22,
    color: COLORS.TECH_GRAY,
  });

  const steps = [
    { num: '1', title: 'VS Code', desc: 'Редактор кода' },
    { num: '2', title: 'Kilo Code', desc: 'AI-расширение' },
    { num: '3', title: 'Первый запуск', desc: 'Проверка работы AI' },
  ];

  steps.forEach((step, i) => {
    const y = 2.3 + i * 1.0;
    addStepCircle(slide, 0.5, y, step.num);

    slide.addText(step.title, {
      x: 1.2, y: y, w: 4, h: 0.35,
      fontFace: 'Arial', fontSize: 22, bold: true,
      color: COLORS.HOLO_WHITE,
    });

    slide.addText(step.desc, {
      x: 1.2, y: y + 0.35, w: 4, h: 0.3,
      fontFace: 'Arial', fontSize: 18,
      color: COLORS.TECH_GRAY,
    });
  });

  // Right column - Result card
  addCard(slide, 7, 1.7, 5.5, 3.5, { border: COLORS.ACID_30 });

  slide.addText('РЕЗУЛЬТАТ УРОКА', {
    x: 7.3, y: 1.9, w: 5, h: 0.4,
    fontFace: 'Courier New', fontSize: 16,
    color: COLORS.CYBER_ACID,
  });

  slide.addText('Полностью настроенное\nрабочее окружение', {
    x: 7.3, y: 2.5, w: 5, h: 0.8,
    fontFace: 'Arial', fontSize: 24,
    color: COLORS.HOLO_WHITE,
  });

  // Free badge
  slide.addShape('roundRect', {
    x: 7.5, y: 3.6, w: 3, h: 0.5,
    fill: { color: COLORS.CYBER_ACID },
    rectRadius: 0.1,
  });

  slide.addText('100% БЕСПЛАТНО', {
    x: 7.5, y: 3.6, w: 3, h: 0.5,
    fontFace: 'Courier New', fontSize: 16, bold: true,
    color: COLORS.CYBER_VOID,
    align: 'center', valign: 'middle',
  });

  slide.addText('Все инструменты — open source', {
    x: 7.3, y: 4.3, w: 5, h: 0.4,
    fontFace: 'Arial', fontSize: 16,
    color: COLORS.TECH_GRAY,
  });

  addFooter(slide);
}

function createSlide6Lesson13(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addBadge(slide, 'УРОК 1.3');

  slide.addText('ДО 40 МИНУТ', {
    x: 0.5, y: 0.4, w: 3, h: 0.4,
    fontFace: 'Courier New', fontSize: 16,
    color: COLORS.CYBER_ACID,
  });

  slide.addText('GIT — ТВОЯ СТРАХОВКА', {
    x: 0.5, y: 0.8, w: 10, h: 0.7,
    ...FONTS.H2,
  });

  // Left column
  slide.addText('Зачем это нужно:', {
    x: 0.5, y: 1.7, w: 4, h: 0.4,
    fontFace: 'Arial', fontSize: 22,
    color: COLORS.TECH_GRAY,
  });

  // Without Git
  addCard(slide, 0.5, 2.3, 5.5, 0.9, { fill: COLORS.RED_10, border: COLORS.SIGNAL_RED });

  slide.addText('БЕЗ GIT', {
    x: 0.7, y: 2.35, w: 5, h: 0.3,
    fontFace: 'Courier New', fontSize: 14,
    color: COLORS.SIGNAL_RED,
  });

  slide.addText('Одна ошибка — код потерян', {
    x: 0.7, y: 2.7, w: 5, h: 0.35,
    fontFace: 'Arial', fontSize: 18,
    color: COLORS.HOLO_WHITE,
  });

  // With Git
  addCard(slide, 0.5, 3.4, 5.5, 0.9, { fill: COLORS.GREEN_10, border: COLORS.CYBER_ACID });

  slide.addText('С GIT', {
    x: 0.7, y: 3.45, w: 5, h: 0.3,
    fontFace: 'Courier New', fontSize: 14,
    color: COLORS.CYBER_ACID,
  });

  slide.addText('Всегда можно откатиться', {
    x: 0.7, y: 3.8, w: 5, h: 0.35,
    fontFace: 'Arial', fontSize: 18,
    color: COLORS.HOLO_WHITE,
  });

  // Right column - Commands
  addCard(slide, 7, 1.7, 5.5, 3.8, { border: COLORS.ACID_30 });

  slide.addText('4 КОМАНДЫ НА СТАРТ', {
    x: 7.3, y: 1.9, w: 5, h: 0.4,
    fontFace: 'Courier New', fontSize: 16,
    color: COLORS.CYBER_ACID,
  });

  const commands = [
    { cmd: 'git init', desc: 'Создать' },
    { cmd: 'git add .', desc: 'Добавить' },
    { cmd: 'git commit', desc: 'Сохранить' },
    { cmd: 'git push', desc: 'В облако' },
  ];

  commands.forEach((item, i) => {
    const y = 2.5 + i * 0.7;

    slide.addShape('roundRect', {
      x: 7.3, y: y, w: 2.2, h: 0.45,
      fill: { color: COLORS.ACID_15 },
      rectRadius: 0.08,
    });

    slide.addText(item.cmd, {
      x: 7.3, y: y, w: 2.2, h: 0.45,
      fontFace: 'Courier New', fontSize: 16,
      color: COLORS.CYBER_ACID,
      align: 'center', valign: 'middle',
    });

    slide.addText(item.desc, {
      x: 9.7, y: y, w: 2.5, h: 0.45,
      fontFace: 'Arial', fontSize: 18,
      color: COLORS.HOLO_WHITE,
      valign: 'middle',
    });
  });

  // Result line
  slide.addText('РЕЗУЛЬТАТ: Умение сохранять и откатывать изменения', {
    x: 0.5, y: 5.0, w: 11, h: 0.4,
    fontFace: 'Arial', fontSize: 18,
    color: COLORS.CYBER_ACID,
  });

  addFooter(slide);
}

function createSlide7Lesson14(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addBadge(slide, 'УРОК 1.4');

  slide.addText('ДО 20 МИНУТ', {
    x: 0.5, y: 0.4, w: 3, h: 0.4,
    fontFace: 'Courier New', fontSize: 16,
    color: COLORS.CYBER_ACID,
  });

  slide.addText('АНАТОМИЯ ПРОМПТА', {
    x: 0.5, y: 0.8, w: 10, h: 0.7,
    ...FONTS.H2,
  });

  // Left column - Structure
  slide.addText('Структура промпта:', {
    x: 0.5, y: 1.7, w: 4, h: 0.4,
    fontFace: 'Arial', fontSize: 22,
    color: COLORS.TECH_GRAY,
  });

  const structure = [
    { title: 'КОНТЕКСТ', desc: 'Что за проект' },
    { title: 'ЗАДАЧА', desc: 'Что конкретно сделать' },
    { title: 'ОГРАНИЧЕНИЯ', desc: 'Что НЕ делать' },
    { title: 'РЕЗУЛЬТАТ', desc: 'Как должно выглядеть' },
  ];

  structure.forEach((item, i) => {
    const y = 2.3 + i * 0.8;
    addLeftAccent(slide, 0.5, y, 0.65);

    slide.addText(item.title, {
      x: 0.65, y: y, w: 4, h: 0.3,
      fontFace: 'Courier New', fontSize: 16,
      color: COLORS.CYBER_ACID,
    });

    slide.addText(item.desc, {
      x: 0.65, y: y + 0.3, w: 4, h: 0.3,
      fontFace: 'Arial', fontSize: 16,
      color: COLORS.TECH_GRAY,
    });
  });

  // Bad example
  addCard(slide, 7, 1.8, 5.5, 1.2, { fill: COLORS.RED_10, border: COLORS.SIGNAL_RED });

  slide.addText('ПЛОХО', {
    x: 7.3, y: 1.9, w: 5, h: 0.3,
    fontFace: 'Courier New', fontSize: 14,
    color: COLORS.SIGNAL_RED,
  });

  slide.addText('"Сделай мне сайт"', {
    x: 7.3, y: 2.3, w: 5, h: 0.5,
    fontFace: 'Arial', fontSize: 20,
    color: COLORS.HOLO_WHITE,
  });

  // Good example
  addCard(slide, 7, 3.3, 5.5, 1.9, { fill: COLORS.GREEN_10, border: COLORS.CYBER_ACID });

  slide.addText('ХОРОШО', {
    x: 7.3, y: 3.4, w: 5, h: 0.3,
    fontFace: 'Courier New', fontSize: 14,
    color: COLORS.CYBER_ACID,
  });

  slide.addText('"Создай HTML калькулятор.\nИспользуй Vanilla JS.\nБез библиотек."', {
    x: 7.3, y: 3.8, w: 5, h: 1.2,
    fontFace: 'Arial', fontSize: 18,
    color: COLORS.HOLO_WHITE,
  });

  // Result line
  slide.addText('РЕЗУЛЬТАТ: Умение формулировать задачи для AI', {
    x: 0.5, y: 5.7, w: 11, h: 0.4,
    fontFace: 'Arial', fontSize: 18,
    color: COLORS.CYBER_ACID,
  });

  addFooter(slide);
}

function createSlide8Lesson15(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addBadge(slide, 'УРОК 1.5');

  slide.addText('ДО 60 МИНУТ • ГЛАВНЫЙ УРОК', {
    x: 0.5, y: 0.4, w: 5, h: 0.4,
    fontFace: 'Courier New', fontSize: 16,
    color: COLORS.CYBER_ACID,
  });

  slide.addText('ПЕРВЫЙ ПРОЕКТ — КАЛЬКУЛЯТОР', {
    x: 0.5, y: 0.8, w: 11, h: 0.7,
    fontFace: 'Arial Black', fontSize: 44, bold: true,
    color: COLORS.HOLO_WHITE,
  });

  // Left column - Steps
  slide.addText('Полный цикл разработки:', {
    x: 0.5, y: 1.7, w: 5, h: 0.4,
    fontFace: 'Arial', fontSize: 22,
    color: COLORS.TECH_GRAY,
  });

  const steps = [
    { num: '1', title: 'Идея', desc: 'определяем что делаем' },
    { num: '2', title: 'Промпт', desc: 'формулируем задачу' },
    { num: '3', title: 'Код', desc: 'AI генерирует' },
    { num: '4', title: 'Тест', desc: 'проверяем' },
  ];

  steps.forEach((step, i) => {
    const y = 2.2 + i * 0.95;
    addStepCircle(slide, 0.5, y, step.num);

    slide.addText(step.title, {
      x: 1.2, y: y, w: 2, h: 0.35,
      fontFace: 'Arial', fontSize: 22, bold: true,
      color: COLORS.HOLO_WHITE,
    });

    slide.addText(step.desc, {
      x: 1.2, y: y + 0.35, w: 4, h: 0.3,
      fontFace: 'Arial', fontSize: 16,
      color: COLORS.TECH_GRAY,
    });

    if (i < 3) {
      slide.addText('|', {
        x: 0.5, y: y + 0.7, w: 0.5, h: 0.25,
        fontFace: 'Arial', fontSize: 18,
        color: COLORS.CYBER_ACID,
        align: 'center',
      });
    }
  });

  // Right column - Result card (highlighted)
  addHighlightedCard(slide, 7, 1.7, 5.5, 3.8);

  slide.addText('РЕЗУЛЬТАТ УРОКА', {
    x: 7.3, y: 1.9, w: 5, h: 0.4,
    fontFace: 'Courier New', fontSize: 16,
    color: COLORS.CYBER_ACID,
  });

  slide.addText('[CALC]', {
    x: 8, y: 2.6, w: 4, h: 0.7,
    fontFace: 'Courier New', fontSize: 32,
    color: COLORS.CYBER_ACID,
    align: 'center',
  });

  slide.addText('Работающий калькулятор', {
    x: 7.3, y: 3.5, w: 5, h: 0.5,
    fontFace: 'Arial', fontSize: 24, bold: true,
    color: COLORS.HOLO_WHITE,
    align: 'center',
  });

  slide.addText('Первый проект в портфолио!', {
    x: 7.3, y: 4.2, w: 5, h: 0.4,
    fontFace: 'Arial', fontSize: 20,
    color: COLORS.CYBER_ACID,
    align: 'center',
  });

  addFooter(slide);
}

function createSlide9Lesson16(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addBadge(slide, 'УРОК 1.6');

  slide.addText('ДО 20 МИНУТ', {
    x: 0.5, y: 0.4, w: 3, h: 0.4,
    fontFace: 'Courier New', fontSize: 16,
    color: COLORS.CYBER_ACID,
  });

  slide.addText('ЧТО ДАЛЬШЕ + БОНУС', {
    x: 0.5, y: 0.8, w: 10, h: 0.7,
    ...FONTS.H2,
  });

  // Left column - Checklist
  slide.addText('Чеклист самопроверки:', {
    x: 0.5, y: 1.7, w: 5, h: 0.4,
    fontFace: 'Arial', fontSize: 22,
    color: COLORS.TECH_GRAY,
  });

  const checklist = [
    'VS Code + Kilo Code установлены',
    'Git настроен и работает',
    'Знаю структуру промпта',
    'Калькулятор работает',
  ];

  checklist.forEach((item, i) => {
    const y = 2.2 + i * 0.6;
    addCheckbox(slide, 0.5, y);
    slide.addText(item, {
      x: 1.0, y: y, w: 5, h: 0.4,
      fontFace: 'Arial', fontSize: 18,
      color: COLORS.HOLO_WHITE,
    });
  });

  // Next step
  addCard(slide, 0.5, 4.9, 5.5, 0.7, { border: COLORS.ACID_30 });

  slide.addText('Следующий шаг: Модуль 2: BUILDER ->', {
    x: 0.7, y: 5.0, w: 5, h: 0.5,
    fontFace: 'Arial', fontSize: 18,
    color: COLORS.HOLO_WHITE,
  });

  // Right column - Bonus card
  addCard(slide, 7, 1.7, 5.5, 3.8, { fill: COLORS.RED_10, border: COLORS.SIGNAL_RED });

  slide.addText('БОНУС К МОДУЛЮ', {
    x: 7.3, y: 1.9, w: 5, h: 0.4,
    fontFace: 'Courier New', fontSize: 16,
    color: COLORS.SIGNAL_RED,
  });

  slide.addText('10 промптов', {
    x: 7.3, y: 2.5, w: 5, h: 0.5,
    fontFace: 'Arial', fontSize: 28, bold: true,
    color: COLORS.HOLO_WHITE,
  });

  slide.addText('Готовые шаблоны', {
    x: 7.3, y: 3.1, w: 5, h: 0.4,
    fontFace: 'Arial', fontSize: 20,
    color: COLORS.TECH_GRAY,
  });

  slide.addText('+ Шаблон Memory Bank', {
    x: 7.3, y: 3.7, w: 5, h: 0.4,
    fontFace: 'Arial', fontSize: 18,
    color: COLORS.HOLO_WHITE,
  });

  slide.addText('+ Чеклист установки', {
    x: 7.3, y: 4.2, w: 5, h: 0.4,
    fontFace: 'Arial', fontSize: 18,
    color: COLORS.HOLO_WHITE,
  });

  addFooter(slide);
}

function createSlide10Results(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  slide.addText('РЕЗУЛЬТАТ МОДУЛЯ', {
    x: 0.5, y: 0.4, w: 10, h: 0.8,
    ...FONTS.H1,
  });

  const results = [
    { icon: '[ENV]', title: 'Настроенное окружение', desc: 'VS Code + Kilo', highlight: false },
    { icon: '[GIT]', title: 'Базовые навыки Git', desc: 'Сохранение/откат', highlight: false },
    { icon: '[>>]', title: 'Умение писать промпты', desc: 'Общение с AI', highlight: false },
    { icon: '[#]', title: 'ГОТОВЫЙ ПРОЕКТ', desc: 'Калькулятор!', highlight: true },
  ];

  const positions = [
    { x: 0.5, y: 1.5 },
    { x: 7, y: 1.5 },
    { x: 0.5, y: 3.6 },
    { x: 7, y: 3.6 },
  ];

  results.forEach((result, i) => {
    const pos = positions[i];

    if (result.highlight) {
      addHighlightedCard(slide, pos.x, pos.y, 5.5, 1.7);
    } else {
      addCard(slide, pos.x, pos.y, 5.5, 1.7);
    }

    slide.addText(result.icon, {
      x: pos.x + 0.3, y: pos.y + 0.2, w: 1, h: 0.4,
      fontFace: 'Courier New', fontSize: 20,
      color: result.highlight ? COLORS.CYBER_ACID : COLORS.TECH_GRAY,
    });

    slide.addText(result.title, {
      x: pos.x + 0.3, y: pos.y + 0.65, w: 5, h: 0.4,
      fontFace: 'Arial', fontSize: 22, bold: true,
      color: result.highlight ? COLORS.CYBER_ACID : COLORS.HOLO_WHITE,
    });

    slide.addText(result.desc, {
      x: pos.x + 0.3, y: pos.y + 1.1, w: 5, h: 0.35,
      fontFace: 'Arial', fontSize: 16,
      color: COLORS.TECH_GRAY,
    });
  });

  addFooter(slide, 'VIBE CODING STARTER');

  slide.addText('+ ГОТОВ К МОДУЛЮ 2', {
    x: 8.5, y: 6.9, w: 4, h: 0.3,
    fontFace: 'Courier New', fontSize: 14,
    color: COLORS.CYBER_ACID,
    align: 'right',
  });
}

function createSlide11LetsGo(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  // Subtitle
  slide.addText('МОДУЛЬ 1 • БЫСТРЫЙ СТАРТ', {
    x: 0, y: 1.5, w: '100%', h: 0.5,
    fontFace: 'Courier New', fontSize: 22,
    color: COLORS.CYBER_ACID,
    align: 'center',
  });

  // Main title
  slide.addText('ПОЕХАЛИ!', {
    x: 0, y: 2.2, w: '100%', h: 1.3,
    fontFace: 'Arial Black', fontSize: 110, bold: true,
    color: COLORS.HOLO_WHITE,
    align: 'center',
  });

  // Tagline
  slide.addText('Начинаем с урока 1.1', {
    x: 0, y: 3.7, w: '100%', h: 0.5,
    fontFace: 'Arial', fontSize: 28,
    color: COLORS.TECH_GRAY,
    align: 'center',
  });

  // CTA Button
  slide.addShape('roundRect', {
    x: 4.2, y: 4.5, w: 5, h: 0.7,
    fill: { color: COLORS.CYBER_ACID },
    rectRadius: 0.1,
  });

  slide.addText('ЧТО ТАКОЕ VIBE CODING ->', {
    x: 4.2, y: 4.5, w: 5, h: 0.7,
    fontFace: 'Arial', fontSize: 20, bold: true,
    color: COLORS.CYBER_VOID,
    align: 'center', valign: 'middle',
  });

  // Progress dots
  slide.addText('*  o  o  o  o  o', {
    x: 0, y: 5.5, w: '100%', h: 0.4,
    fontFace: 'Arial', fontSize: 22,
    color: COLORS.CYBER_ACID,
    align: 'center',
  });

  slide.addText('(6 уроков)', {
    x: 0, y: 5.9, w: '100%', h: 0.3,
    fontFace: 'Arial', fontSize: 14,
    color: COLORS.TECH_GRAY,
    align: 'center',
  });
}

// ============================================================================
// MAIN
// ============================================================================

async function createPresentation() {
  console.log('Creating VIBE CODING STARTER presentation...\n');

  const pptx = new pptxgen();

  // Set slide dimensions (16:9)
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = 'VIBE CODING STARTER - Module 1';
  pptx.author = 'onAI Academy';

  // Create all slides
  console.log('Creating Slide 1: Title...');
  createSlide1Title(pptx);

  console.log('Creating Slide 2: Overview...');
  createSlide2Overview(pptx);

  console.log('Creating Slide 3: Program...');
  createSlide3Program(pptx);

  console.log('Creating Slide 4: Lesson 1.1...');
  createSlide4Lesson11(pptx);

  console.log('Creating Slide 5: Lesson 1.2...');
  createSlide5Lesson12(pptx);

  console.log('Creating Slide 6: Lesson 1.3...');
  createSlide6Lesson13(pptx);

  console.log('Creating Slide 7: Lesson 1.4...');
  createSlide7Lesson14(pptx);

  console.log('Creating Slide 8: Lesson 1.5...');
  createSlide8Lesson15(pptx);

  console.log('Creating Slide 9: Lesson 1.6...');
  createSlide9Lesson16(pptx);

  console.log('Creating Slide 10: Results...');
  createSlide10Results(pptx);

  console.log('Creating Slide 11: Let\'s Go...');
  createSlide11LetsGo(pptx);

  // Save the presentation
  const outputPath = path.join(__dirname, 'VIBE_CODING_MODULE1_INTRO.pptx');

  try {
    await pptx.writeFile({ fileName: outputPath });
    console.log(`\nPresentation saved to: ${outputPath}`);
  } catch (err) {
    console.error('Error saving presentation:', err);
  }
}

// Run
createPresentation();
