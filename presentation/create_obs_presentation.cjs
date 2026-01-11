/**
 * VIBE CODING STARTER - Module 1 Presentation Generator
 * OBS Layout: 40% left (camera) | 60% right (content)
 * Brand: CYBER-ARCHITECTURE v3.0
 */

const pptxgen = require('pptxgenjs');
const path = require('path');

// ============================================================================
// BRAND COLORS
// ============================================================================
const COLORS = {
  CYBER_ACID: '00FF88',      // CTA, accents, active cards
  CYBER_VOID: '030303',      // Background
  CYBER_SURFACE: '0A0A0A',   // Card backgrounds
  SIGNAL_RED: 'FF3366',      // Warnings, bonuses
  HOLO_WHITE: 'FFFFFF',      // Headers, main text
  TECH_GRAY: '9CA3AF',       // Secondary text
  CARD_BORDER: '1A1A1A',     // Card borders
  ACID_15: '0D2B1B',         // Subtle green bg
};

// ============================================================================
// LAYOUT CONSTANTS (35% left empty | 65% right content)
// ============================================================================
const SLIDE_WIDTH = 13.333;  // inches (16:9)
const SLIDE_HEIGHT = 7.5;

const CAMERA_ZONE = SLIDE_WIDTH * 0.35;  // 35% for camera (~4.67")
const CONTENT_START = CAMERA_ZONE + 0.2; // Start of content area (~4.87")
const CONTENT_WIDTH = SLIDE_WIDTH - CONTENT_START - 0.5; // Content width with padding (~7.96")
const CONTENT_END = CONTENT_START + CONTENT_WIDTH; // Right edge of content

// Right card positioning (cards on the right side of slides)
const RIGHT_CARD_W = 2.6;  // Width of right side cards
const RIGHT_CARD_X = CONTENT_END - RIGHT_CARD_W - 0.1; // X position for right cards
const RIGHT_CARD_INNER = RIGHT_CARD_X + 0.2; // Inner padding for text in right cards

// Logo position (inside content area)
const LOGO_X = CONTENT_END - 1.5;
const LOGO_Y = 0.3;

// ============================================================================
// FONTS (with fallbacks)
// ============================================================================
const FONTS = {
  DISPLAY: 'Arial Black',    // Fallback for Space Grotesk Bold
  BODY: 'Arial',             // Fallback for Manrope
  MONO: 'Courier New',       // Fallback for JetBrains Mono
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function addLogo(slide) {
  // onAI DIGITAL ACADEMY logo
  slide.addText([
    { text: 'on', options: { color: COLORS.HOLO_WHITE, bold: false } },
    { text: 'AI', options: { color: COLORS.CYBER_ACID, bold: true } },
  ], {
    x: LOGO_X, y: LOGO_Y, w: 1, h: 0.35,
    fontFace: FONTS.DISPLAY, fontSize: 18,
  });

  slide.addText('DIGITAL\nACADEMY', {
    x: LOGO_X + 0.85, y: LOGO_Y - 0.05, w: 0.8, h: 0.45,
    fontFace: FONTS.MONO, fontSize: 7,
    color: COLORS.TECH_GRAY,
    lineSpacing: 10,
  });
}

function addCard(slide, x, y, w, h, options = {}) {
  const {
    fill = COLORS.CYBER_SURFACE,
    border = COLORS.CARD_BORDER,
    isActive = false,
  } = options;

  const actualFill = isActive ? COLORS.CYBER_ACID : fill;
  const actualBorder = isActive ? COLORS.CYBER_ACID : border;

  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: actualFill },
    line: { color: actualBorder, width: 1 },
    rectRadius: 0.15,
  });
}

function addNumberCard(slide, x, y, w, h, number, title, subtitle, isActive = false) {
  addCard(slide, x, y, w, h, { isActive });

  const textColor = isActive ? COLORS.CYBER_VOID : COLORS.HOLO_WHITE;
  const subtitleColor = isActive ? COLORS.CYBER_VOID : COLORS.TECH_GRAY;

  // Number
  slide.addText(number, {
    x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.4,
    fontFace: FONTS.DISPLAY, fontSize: 24, bold: true,
    color: textColor,
  });

  // Title
  slide.addText(title, {
    x: x + 0.2, y: y + 0.55, w: w - 0.4, h: 0.6,
    fontFace: FONTS.BODY, fontSize: 16, bold: true,
    color: textColor,
    valign: 'top',
  });

  // Subtitle (if exists)
  if (subtitle) {
    slide.addText(subtitle, {
      x: x + 0.2, y: y + h - 0.45, w: w - 0.4, h: 0.35,
      fontFace: FONTS.BODY, fontSize: 12,
      color: subtitleColor,
    });
  }
}

function addFooter(slide, text = 'VIBE CODING STARTER // MODULE 1') {
  slide.addText(text, {
    x: CONTENT_START, y: SLIDE_HEIGHT - 0.5, w: CONTENT_WIDTH, h: 0.3,
    fontFace: FONTS.MONO, fontSize: 10,
    color: COLORS.TECH_GRAY,
  });
}

function addTitle(slide, text, options = {}) {
  const { y = 0.8, fontSize = 42, color = COLORS.HOLO_WHITE } = options;

  slide.addText(text.toUpperCase(), {
    x: CONTENT_START, y, w: CONTENT_WIDTH, h: 0.8,
    fontFace: FONTS.DISPLAY, fontSize, bold: true,
    color,
  });
}

function addSubtitle(slide, text, y = 1.5) {
  slide.addText(text, {
    x: CONTENT_START, y, w: CONTENT_WIDTH, h: 0.4,
    fontFace: FONTS.MONO, fontSize: 14,
    color: COLORS.CYBER_ACID,
  });
}

// ============================================================================
// SLIDE CREATORS
// ============================================================================

function createSlide1Title(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addLogo(slide);

  // Module label
  slide.addText('VIBE CODING STARTER', {
    x: CONTENT_START, y: 2, w: CONTENT_WIDTH, h: 0.4,
    fontFace: FONTS.MONO, fontSize: 16,
    color: COLORS.CYBER_ACID,
  });

  // Main title
  slide.addText('БЫСТРЫЙ\nСТАРТ', {
    x: CONTENT_START, y: 2.5, w: CONTENT_WIDTH, h: 2,
    fontFace: FONTS.DISPLAY, fontSize: 72, bold: true,
    color: COLORS.HOLO_WHITE,
    lineSpacing: 72,
  });

  // Tagline
  slide.addText('От нуля до первого проекта за 4 часа', {
    x: CONTENT_START, y: 4.7, w: CONTENT_WIDTH, h: 0.5,
    fontFace: FONTS.BODY, fontSize: 20,
    color: COLORS.TECH_GRAY,
  });

  // Accent line
  slide.addShape('rect', {
    x: CONTENT_START, y: 5.3, w: 2.5, h: 0.05,
    fill: { color: COLORS.CYBER_ACID },
  });

  addFooter(slide, 'MODULE 1 // INTRO');
}

function createSlide2Overview(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addLogo(slide);
  addTitle(slide, 'ЧТО ВАС ЖДЁТ В МОДУЛЕ');

  // Stats cards row
  const cardY = 2;
  const cardW = 2.2;
  const cardH = 1.5;
  const gap = 0.25;

  const stats = [
    { num: '6', title: 'Уроков', sub: 'От основ до проекта', active: true },
    { num: '~4ч', title: 'Контента', sub: 'Концентрированно', active: false },
    { num: '1', title: 'Проект', sub: 'В портфолио', active: false },
  ];

  stats.forEach((stat, i) => {
    const x = CONTENT_START + i * (cardW + gap);
    addNumberCard(slide, x, cardY, cardW, cardH, stat.num, stat.title, stat.sub, stat.active);
  });

  // Result card
  addCard(slide, CONTENT_START, 3.8, CONTENT_WIDTH - 0.5, 1.8, { border: COLORS.CYBER_ACID });

  slide.addText('РЕЗУЛЬТАТ МОДУЛЯ', {
    x: CONTENT_START + 0.3, y: 4, w: 3, h: 0.3,
    fontFace: FONTS.MONO, fontSize: 12,
    color: COLORS.CYBER_ACID,
  });

  slide.addText('Базовые навыки AI-программирования', {
    x: CONTENT_START + 0.3, y: 4.4, w: CONTENT_WIDTH - 1, h: 0.5,
    fontFace: FONTS.BODY, fontSize: 22, bold: true,
    color: COLORS.HOLO_WHITE,
  });

  slide.addText('и первый работающий проект в портфолио', {
    x: CONTENT_START + 0.3, y: 4.95, w: CONTENT_WIDTH - 1, h: 0.4,
    fontFace: FONTS.BODY, fontSize: 16,
    color: COLORS.TECH_GRAY,
  });

  addFooter(slide);
}

function createSlide3Program(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addLogo(slide);
  addTitle(slide, 'ПРОГРАММА МОДУЛЯ');

  const lessons = [
    { num: '1.1', title: 'Революция в программировании', time: '20 мин' },
    { num: '1.2', title: 'Установка за 15 минут', time: '30 мин' },
    { num: '1.3', title: 'Git — твоя страховка', time: '40 мин' },
    { num: '1.4', title: 'Анатомия промпта', time: '20 мин' },
    { num: '1.5', title: 'Первый проект — Калькулятор', time: '60 мин', highlight: true },
    { num: '1.6', title: 'Что дальше + Бонус', time: '20 мин' },
  ];

  const startY = 1.8;
  const rowH = 0.7;

  lessons.forEach((lesson, i) => {
    const y = startY + i * rowH;
    const isHighlight = lesson.highlight;

    // Row background
    if (isHighlight) {
      slide.addShape('roundRect', {
        x: CONTENT_START, y, w: CONTENT_WIDTH - 0.5, h: rowH - 0.08,
        fill: { color: COLORS.ACID_15 },
        line: { color: COLORS.CYBER_ACID, width: 1 },
        rectRadius: 0.1,
      });
    }

    // Left accent
    slide.addShape('rect', {
      x: CONTENT_START, y, w: 0.05, h: rowH - 0.08,
      fill: { color: COLORS.CYBER_ACID },
    });

    // Number
    slide.addText(lesson.num, {
      x: CONTENT_START + 0.2, y: y + 0.15, w: 0.6, h: 0.35,
      fontFace: FONTS.MONO, fontSize: 14, bold: true,
      color: COLORS.CYBER_ACID,
    });

    // Title
    slide.addText(lesson.title, {
      x: CONTENT_START + 0.9, y: y + 0.15, w: 4.5, h: 0.35,
      fontFace: FONTS.BODY, fontSize: 16,
      color: COLORS.HOLO_WHITE,
    });

    // Time
    slide.addText(lesson.time, {
      x: CONTENT_START + CONTENT_WIDTH - 1.5, y: y + 0.15, w: 1, h: 0.35,
      fontFace: FONTS.MONO, fontSize: 12,
      color: isHighlight ? COLORS.CYBER_ACID : COLORS.TECH_GRAY,
      align: 'right',
    });
  });

  // Total
  slide.addText('ИТОГО: ~4 ЧАСА', {
    x: CONTENT_START + CONTENT_WIDTH - 2.5, y: 6.2, w: 2, h: 0.3,
    fontFace: FONTS.MONO, fontSize: 14, bold: true,
    color: COLORS.CYBER_ACID,
    align: 'right',
  });

  addFooter(slide);
}

function createSlide4Lesson11(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addLogo(slide);

  // Badge
  slide.addShape('roundRect', {
    x: CONTENT_START, y: 0.5, w: 1.2, h: 0.35,
    fill: { color: COLORS.CYBER_ACID },
    rectRadius: 0.08,
  });
  slide.addText('УРОК 1.1', {
    x: CONTENT_START, y: 0.5, w: 1.2, h: 0.35,
    fontFace: FONTS.MONO, fontSize: 11, bold: true,
    color: COLORS.CYBER_VOID,
    align: 'center', valign: 'middle',
  });

  // Time
  slide.addText('20 МИНУТ', {
    x: CONTENT_START + 1.4, y: 0.53, w: 1.5, h: 0.3,
    fontFace: FONTS.MONO, fontSize: 11,
    color: COLORS.TECH_GRAY,
  });

  addTitle(slide, 'ЧТО ТАКОЕ VIBE CODING', { y: 1.1 });

  // What you'll learn
  slide.addText('Вы узнаете:', {
    x: CONTENT_START, y: 2, w: 3, h: 0.4,
    fontFace: FONTS.BODY, fontSize: 14,
    color: COLORS.TECH_GRAY,
  });

  const points = [
    'AI-парное программирование',
    'Почему это работает сейчас',
    'Демонстрация на примере',
    'Отличие от классического подхода',
  ];

  points.forEach((point, i) => {
    const y = 2.5 + i * 0.5;

    // Checkbox
    slide.addShape('roundRect', {
      x: CONTENT_START, y, w: 0.28, h: 0.28,
      fill: { color: COLORS.CYBER_VOID },
      line: { color: COLORS.CYBER_ACID, width: 2 },
      rectRadius: 0.05,
    });
    slide.addText('+', {
      x: CONTENT_START, y: y - 0.02, w: 0.28, h: 0.28,
      fontFace: FONTS.BODY, fontSize: 14, bold: true,
      color: COLORS.CYBER_ACID,
      align: 'center', valign: 'middle',
    });

    slide.addText(point, {
      x: CONTENT_START + 0.45, y, w: 4, h: 0.35,
      fontFace: FONTS.BODY, fontSize: 15,
      color: COLORS.HOLO_WHITE,
    });
  });

  // Formula card
  addCard(slide, RIGHT_CARD_X, 2, 2.8, 3.2, { border: COLORS.CYBER_ACID });

  slide.addText('ГЛАВНАЯ ФОРМУЛА', {
    x: RIGHT_CARD_INNER, y: 2.15, w: 2.4, h: 0.3,
    fontFace: FONTS.MONO, fontSize: 10,
    color: COLORS.CYBER_ACID,
  });

  const formula = ['ИДЕЯ', '+', 'КОНТЕКСТ', '+', 'AI'];
  formula.forEach((item, i) => {
    const isPlus = item === '+';
    slide.addText(item, {
      x: RIGHT_CARD_INNER, y: 2.6 + i * 0.38, w: 2.4, h: 0.35,
      fontFace: FONTS.DISPLAY, fontSize: isPlus ? 16 : 20, bold: true,
      color: isPlus ? COLORS.CYBER_ACID : COLORS.HOLO_WHITE,
      align: 'center',
    });
  });

  // Divider
  slide.addShape('rect', {
    x: RIGHT_CARD_INNER + 0.3, y: 4.55, w: 1.8, h: 0.03,
    fill: { color: COLORS.HOLO_WHITE },
  });

  slide.addText('= ЧИСТЫЙ КОД', {
    x: RIGHT_CARD_INNER, y: 4.7, w: 2.4, h: 0.4,
    fontFace: FONTS.DISPLAY, fontSize: 16, bold: true,
    color: COLORS.CYBER_ACID,
    align: 'center',
  });

  addFooter(slide);
}

function createSlide5Lesson12(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addLogo(slide);

  // Badge
  slide.addShape('roundRect', {
    x: CONTENT_START, y: 0.5, w: 1.2, h: 0.35,
    fill: { color: COLORS.CYBER_ACID },
    rectRadius: 0.08,
  });
  slide.addText('УРОК 1.2', {
    x: CONTENT_START, y: 0.5, w: 1.2, h: 0.35,
    fontFace: FONTS.MONO, fontSize: 11, bold: true,
    color: COLORS.CYBER_VOID,
    align: 'center', valign: 'middle',
  });

  slide.addText('30 МИНУТ', {
    x: CONTENT_START + 1.4, y: 0.53, w: 1.5, h: 0.3,
    fontFace: FONTS.MONO, fontSize: 11,
    color: COLORS.TECH_GRAY,
  });

  addTitle(slide, 'УСТАНОВКА ОКРУЖЕНИЯ', { y: 1.1 });

  // Steps
  slide.addText('Что установим:', {
    x: CONTENT_START, y: 2, w: 3, h: 0.4,
    fontFace: FONTS.BODY, fontSize: 14,
    color: COLORS.TECH_GRAY,
  });

  const steps = [
    { num: '01', title: 'VS Code', desc: 'Редактор кода' },
    { num: '02', title: 'Kilo Code', desc: 'AI-расширение' },
    { num: '03', title: 'Первый запуск', desc: 'Проверка AI' },
  ];

  steps.forEach((step, i) => {
    const y = 2.5 + i * 0.9;

    // Step number circle
    slide.addShape('ellipse', {
      x: CONTENT_START, y, w: 0.45, h: 0.45,
      fill: { color: COLORS.CYBER_ACID },
    });
    slide.addText(step.num, {
      x: CONTENT_START, y, w: 0.45, h: 0.45,
      fontFace: FONTS.MONO, fontSize: 12, bold: true,
      color: COLORS.CYBER_VOID,
      align: 'center', valign: 'middle',
    });

    slide.addText(step.title, {
      x: CONTENT_START + 0.6, y: y - 0.02, w: 3, h: 0.3,
      fontFace: FONTS.BODY, fontSize: 18, bold: true,
      color: COLORS.HOLO_WHITE,
    });

    slide.addText(step.desc, {
      x: CONTENT_START + 0.6, y: y + 0.28, w: 3, h: 0.25,
      fontFace: FONTS.BODY, fontSize: 13,
      color: COLORS.TECH_GRAY,
    });
  });

  // Result card
  addCard(slide, RIGHT_CARD_X, 2, 2.8, 2.8, { border: COLORS.CYBER_ACID });

  slide.addText('РЕЗУЛЬТАТ', {
    x: RIGHT_CARD_INNER, y: 2.15, w: 2.4, h: 0.3,
    fontFace: FONTS.MONO, fontSize: 10,
    color: COLORS.CYBER_ACID,
  });

  slide.addText('Полностью\nнастроенное\nокружение', {
    x: RIGHT_CARD_INNER, y: 2.6, w: 2.4, h: 1.2,
    fontFace: FONTS.BODY, fontSize: 18, bold: true,
    color: COLORS.HOLO_WHITE,
    lineSpacing: 22,
  });

  // Free badge
  slide.addShape('roundRect', {
    x: RIGHT_CARD_INNER + 0.1, y: 4, w: 2.2, h: 0.4,
    fill: { color: COLORS.CYBER_ACID },
    rectRadius: 0.08,
  });
  slide.addText('100% БЕСПЛАТНО', {
    x: RIGHT_CARD_INNER + 0.1, y: 4, w: 2.2, h: 0.4,
    fontFace: FONTS.MONO, fontSize: 11, bold: true,
    color: COLORS.CYBER_VOID,
    align: 'center', valign: 'middle',
  });

  addFooter(slide);
}

function createSlide6Lesson13(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addLogo(slide);

  // Badge
  slide.addShape('roundRect', {
    x: CONTENT_START, y: 0.5, w: 1.2, h: 0.35,
    fill: { color: COLORS.CYBER_ACID },
    rectRadius: 0.08,
  });
  slide.addText('УРОК 1.3', {
    x: CONTENT_START, y: 0.5, w: 1.2, h: 0.35,
    fontFace: FONTS.MONO, fontSize: 11, bold: true,
    color: COLORS.CYBER_VOID,
    align: 'center', valign: 'middle',
  });

  slide.addText('40 МИНУТ', {
    x: CONTENT_START + 1.4, y: 0.53, w: 1.5, h: 0.3,
    fontFace: FONTS.MONO, fontSize: 11,
    color: COLORS.TECH_GRAY,
  });

  addTitle(slide, 'GIT — ТВОЯ СТРАХОВКА', { y: 1.1 });

  // Comparison
  // Without Git
  slide.addShape('roundRect', {
    x: CONTENT_START, y: 2.1, w: 3.8, h: 0.8,
    fill: { color: '1A0A0F' },
    line: { color: COLORS.SIGNAL_RED, width: 1 },
    rectRadius: 0.1,
  });
  slide.addText('БЕЗ GIT', {
    x: CONTENT_START + 0.2, y: 2.15, w: 1.5, h: 0.25,
    fontFace: FONTS.MONO, fontSize: 10,
    color: COLORS.SIGNAL_RED,
  });
  slide.addText('Одна ошибка — код потерян', {
    x: CONTENT_START + 0.2, y: 2.45, w: 3.4, h: 0.35,
    fontFace: FONTS.BODY, fontSize: 14,
    color: COLORS.HOLO_WHITE,
  });

  // With Git
  slide.addShape('roundRect', {
    x: CONTENT_START, y: 3.1, w: 3.8, h: 0.8,
    fill: { color: COLORS.ACID_15 },
    line: { color: COLORS.CYBER_ACID, width: 1 },
    rectRadius: 0.1,
  });
  slide.addText('С GIT', {
    x: CONTENT_START + 0.2, y: 3.15, w: 1.5, h: 0.25,
    fontFace: FONTS.MONO, fontSize: 10,
    color: COLORS.CYBER_ACID,
  });
  slide.addText('Всегда можно откатиться', {
    x: CONTENT_START + 0.2, y: 3.45, w: 3.4, h: 0.35,
    fontFace: FONTS.BODY, fontSize: 14,
    color: COLORS.HOLO_WHITE,
  });

  // Commands card
  addCard(slide, RIGHT_CARD_X, 2, 2.8, 3.5, { border: COLORS.CYBER_ACID });

  slide.addText('4 КОМАНДЫ НА СТАРТ', {
    x: RIGHT_CARD_INNER, y: 2.15, w: 2.4, h: 0.3,
    fontFace: FONTS.MONO, fontSize: 10,
    color: COLORS.CYBER_ACID,
  });

  const commands = [
    { cmd: 'git init', desc: 'Создать' },
    { cmd: 'git add .', desc: 'Добавить' },
    { cmd: 'git commit', desc: 'Сохранить' },
    { cmd: 'git push', desc: 'В облако' },
  ];

  commands.forEach((item, i) => {
    const y = 2.6 + i * 0.65;

    slide.addShape('roundRect', {
      x: RIGHT_CARD_INNER, y, w: 1.5, h: 0.35,
      fill: { color: COLORS.ACID_15 },
      rectRadius: 0.06,
    });
    slide.addText(item.cmd, {
      x: RIGHT_CARD_INNER, y, w: 1.5, h: 0.35,
      fontFace: FONTS.MONO, fontSize: 11,
      color: COLORS.CYBER_ACID,
      align: 'center', valign: 'middle',
    });

    slide.addText(item.desc, {
      x: RIGHT_CARD_INNER + 1.6, y, w: 1, h: 0.35,
      fontFace: FONTS.BODY, fontSize: 12,
      color: COLORS.HOLO_WHITE,
      valign: 'middle',
    });
  });

  // Result
  slide.addText('РЕЗУЛЬТАТ: Умение сохранять и откатывать код', {
    x: CONTENT_START, y: 4.3, w: CONTENT_WIDTH - 0.5, h: 0.4,
    fontFace: FONTS.BODY, fontSize: 14,
    color: COLORS.CYBER_ACID,
  });

  addFooter(slide);
}

function createSlide7Lesson14(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addLogo(slide);

  // Badge
  slide.addShape('roundRect', {
    x: CONTENT_START, y: 0.5, w: 1.2, h: 0.35,
    fill: { color: COLORS.CYBER_ACID },
    rectRadius: 0.08,
  });
  slide.addText('УРОК 1.4', {
    x: CONTENT_START, y: 0.5, w: 1.2, h: 0.35,
    fontFace: FONTS.MONO, fontSize: 11, bold: true,
    color: COLORS.CYBER_VOID,
    align: 'center', valign: 'middle',
  });

  slide.addText('20 МИНУТ', {
    x: CONTENT_START + 1.4, y: 0.53, w: 1.5, h: 0.3,
    fontFace: FONTS.MONO, fontSize: 11,
    color: COLORS.TECH_GRAY,
  });

  addTitle(slide, 'АНАТОМИЯ ПРОМПТА', { y: 1.1 });

  // Structure
  slide.addText('Структура:', {
    x: CONTENT_START, y: 2, w: 3, h: 0.4,
    fontFace: FONTS.BODY, fontSize: 14,
    color: COLORS.TECH_GRAY,
  });

  const structure = [
    { title: 'КОНТЕКСТ', desc: 'Что за проект' },
    { title: 'ЗАДАЧА', desc: 'Что сделать' },
    { title: 'ОГРАНИЧЕНИЯ', desc: 'Что НЕ делать' },
    { title: 'РЕЗУЛЬТАТ', desc: 'Ожидаемый вид' },
  ];

  structure.forEach((item, i) => {
    const y = 2.4 + i * 0.65;

    slide.addShape('rect', {
      x: CONTENT_START, y, w: 0.05, h: 0.55,
      fill: { color: COLORS.CYBER_ACID },
    });

    slide.addText(item.title, {
      x: CONTENT_START + 0.2, y, w: 2, h: 0.28,
      fontFace: FONTS.MONO, fontSize: 11,
      color: COLORS.CYBER_ACID,
    });

    slide.addText(item.desc, {
      x: CONTENT_START + 0.2, y: y + 0.25, w: 3, h: 0.25,
      fontFace: FONTS.BODY, fontSize: 12,
      color: COLORS.TECH_GRAY,
    });
  });

  // Examples
  // Bad
  slide.addShape('roundRect', {
    x: RIGHT_CARD_X, y: 2, w: 2.8, h: 1.1,
    fill: { color: '1A0A0F' },
    line: { color: COLORS.SIGNAL_RED, width: 1 },
    rectRadius: 0.1,
  });
  slide.addText('ПЛОХО', {
    x: RIGHT_CARD_INNER, y: 2.1, w: 1, h: 0.25,
    fontFace: FONTS.MONO, fontSize: 10,
    color: COLORS.SIGNAL_RED,
  });
  slide.addText('"Сделай мне сайт"', {
    x: RIGHT_CARD_INNER, y: 2.45, w: 2.4, h: 0.5,
    fontFace: FONTS.BODY, fontSize: 14,
    color: COLORS.HOLO_WHITE,
  });

  // Good
  slide.addShape('roundRect', {
    x: RIGHT_CARD_X, y: 3.3, w: 2.8, h: 1.6,
    fill: { color: COLORS.ACID_15 },
    line: { color: COLORS.CYBER_ACID, width: 1 },
    rectRadius: 0.1,
  });
  slide.addText('ХОРОШО', {
    x: RIGHT_CARD_INNER, y: 3.4, w: 1, h: 0.25,
    fontFace: FONTS.MONO, fontSize: 10,
    color: COLORS.CYBER_ACID,
  });
  slide.addText('"Создай HTML\nкалькулятор.\nVanilla JS.\nБез библиотек."', {
    x: RIGHT_CARD_INNER, y: 3.7, w: 2.4, h: 1.1,
    fontFace: FONTS.BODY, fontSize: 13,
    color: COLORS.HOLO_WHITE,
    lineSpacing: 16,
  });

  addFooter(slide);
}

function createSlide8Lesson15(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addLogo(slide);

  // Badge + highlight
  slide.addShape('roundRect', {
    x: CONTENT_START, y: 0.5, w: 1.2, h: 0.35,
    fill: { color: COLORS.CYBER_ACID },
    rectRadius: 0.08,
  });
  slide.addText('УРОК 1.5', {
    x: CONTENT_START, y: 0.5, w: 1.2, h: 0.35,
    fontFace: FONTS.MONO, fontSize: 11, bold: true,
    color: COLORS.CYBER_VOID,
    align: 'center', valign: 'middle',
  });

  slide.addText('60 МИН // ГЛАВНЫЙ УРОК', {
    x: CONTENT_START + 1.4, y: 0.53, w: 2.5, h: 0.3,
    fontFace: FONTS.MONO, fontSize: 11,
    color: COLORS.CYBER_ACID,
  });

  addTitle(slide, 'ПЕРВЫЙ ПРОЕКТ', { y: 1.1, fontSize: 38 });
  slide.addText('КАЛЬКУЛЯТОР', {
    x: CONTENT_START, y: 1.6, w: CONTENT_WIDTH, h: 0.6,
    fontFace: FONTS.DISPLAY, fontSize: 32, bold: true,
    color: COLORS.CYBER_ACID,
  });

  // Steps
  slide.addText('Полный цикл:', {
    x: CONTENT_START, y: 2.4, w: 3, h: 0.4,
    fontFace: FONTS.BODY, fontSize: 14,
    color: COLORS.TECH_GRAY,
  });

  const steps = [
    { num: '01', title: 'Идея', desc: 'что делаем' },
    { num: '02', title: 'Промпт', desc: 'формулируем' },
    { num: '03', title: 'Код', desc: 'AI генерирует' },
    { num: '04', title: 'Тест', desc: 'проверяем' },
  ];

  steps.forEach((step, i) => {
    const y = 2.9 + i * 0.7;

    slide.addShape('ellipse', {
      x: CONTENT_START, y, w: 0.4, h: 0.4,
      fill: { color: COLORS.CYBER_ACID },
    });
    slide.addText(step.num, {
      x: CONTENT_START, y, w: 0.4, h: 0.4,
      fontFace: FONTS.MONO, fontSize: 11, bold: true,
      color: COLORS.CYBER_VOID,
      align: 'center', valign: 'middle',
    });

    slide.addText(step.title, {
      x: CONTENT_START + 0.55, y: y + 0.02, w: 2, h: 0.25,
      fontFace: FONTS.BODY, fontSize: 16, bold: true,
      color: COLORS.HOLO_WHITE,
    });

    slide.addText(step.desc, {
      x: CONTENT_START + 1.6, y: y + 0.02, w: 2, h: 0.25,
      fontFace: FONTS.BODY, fontSize: 12,
      color: COLORS.TECH_GRAY,
    });

    // Arrow
    if (i < 3) {
      slide.addText('|', {
        x: CONTENT_START + 0.12, y: y + 0.4, w: 0.2, h: 0.25,
        fontFace: FONTS.BODY, fontSize: 14,
        color: COLORS.CYBER_ACID,
        align: 'center',
      });
    }
  });

  // Result card (highlighted)
  slide.addShape('roundRect', {
    x: RIGHT_CARD_X, y: 2.4, w: 2.8, h: 3,
    fill: { color: COLORS.ACID_15 },
    line: { color: COLORS.CYBER_ACID, width: 2 },
    rectRadius: 0.15,
    shadow: { type: 'outer', blur: 15, offset: 0, angle: 0, color: '00FF88', opacity: 0.3 },
  });

  slide.addText('РЕЗУЛЬТАТ', {
    x: RIGHT_CARD_INNER, y: 2.55, w: 2.4, h: 0.3,
    fontFace: FONTS.MONO, fontSize: 10,
    color: COLORS.CYBER_ACID,
  });

  // Calculator icon (simple representation)
  slide.addShape('roundRect', {
    x: RIGHT_CARD_X + 0.9, y: 3, w: 0.8, h: 1,
    fill: { color: COLORS.CYBER_ACID },
    rectRadius: 0.1,
  });
  slide.addText('[ = ]', {
    x: RIGHT_CARD_X + 0.9, y: 3.3, w: 0.8, h: 0.4,
    fontFace: FONTS.MONO, fontSize: 14, bold: true,
    color: COLORS.CYBER_VOID,
    align: 'center', valign: 'middle',
  });

  slide.addText('Работающий\nкалькулятор', {
    x: RIGHT_CARD_INNER, y: 4.2, w: 2.4, h: 0.7,
    fontFace: FONTS.BODY, fontSize: 16, bold: true,
    color: COLORS.HOLO_WHITE,
    align: 'center',
    lineSpacing: 20,
  });

  slide.addText('Первый проект\nв портфолио!', {
    x: RIGHT_CARD_INNER, y: 4.9, w: 2.4, h: 0.5,
    fontFace: FONTS.BODY, fontSize: 12,
    color: COLORS.CYBER_ACID,
    align: 'center',
    lineSpacing: 14,
  });

  addFooter(slide);
}

function createSlide9Lesson16(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addLogo(slide);

  // Badge
  slide.addShape('roundRect', {
    x: CONTENT_START, y: 0.5, w: 1.2, h: 0.35,
    fill: { color: COLORS.CYBER_ACID },
    rectRadius: 0.08,
  });
  slide.addText('УРОК 1.6', {
    x: CONTENT_START, y: 0.5, w: 1.2, h: 0.35,
    fontFace: FONTS.MONO, fontSize: 11, bold: true,
    color: COLORS.CYBER_VOID,
    align: 'center', valign: 'middle',
  });

  slide.addText('20 МИНУТ', {
    x: CONTENT_START + 1.4, y: 0.53, w: 1.5, h: 0.3,
    fontFace: FONTS.MONO, fontSize: 11,
    color: COLORS.TECH_GRAY,
  });

  addTitle(slide, 'ЧТО ДАЛЬШЕ + БОНУС', { y: 1.1 });

  // Checklist
  slide.addText('Чеклист самопроверки:', {
    x: CONTENT_START, y: 2, w: 4, h: 0.4,
    fontFace: FONTS.BODY, fontSize: 14,
    color: COLORS.TECH_GRAY,
  });

  const checklist = [
    'VS Code + Kilo Code установлены',
    'Git настроен и работает',
    'Знаю структуру промпта',
    'Калькулятор работает',
  ];

  checklist.forEach((item, i) => {
    const y = 2.5 + i * 0.5;

    slide.addShape('roundRect', {
      x: CONTENT_START, y, w: 0.28, h: 0.28,
      fill: { color: COLORS.CYBER_VOID },
      line: { color: COLORS.CYBER_ACID, width: 2 },
      rectRadius: 0.05,
    });
    slide.addText('+', {
      x: CONTENT_START, y: y - 0.02, w: 0.28, h: 0.28,
      fontFace: FONTS.BODY, fontSize: 14, bold: true,
      color: COLORS.CYBER_ACID,
      align: 'center', valign: 'middle',
    });

    slide.addText(item, {
      x: CONTENT_START + 0.45, y, w: 4, h: 0.35,
      fontFace: FONTS.BODY, fontSize: 14,
      color: COLORS.HOLO_WHITE,
    });
  });

  // Next step
  slide.addShape('roundRect', {
    x: CONTENT_START, y: 4.8, w: 3.8, h: 0.6,
    fill: { color: COLORS.CYBER_SURFACE },
    line: { color: COLORS.CYBER_ACID, width: 1 },
    rectRadius: 0.1,
  });
  slide.addText('Следующий шаг: Модуль 2 BUILDER ->', {
    x: CONTENT_START + 0.2, y: 4.9, w: 3.4, h: 0.4,
    fontFace: FONTS.BODY, fontSize: 13,
    color: COLORS.HOLO_WHITE,
  });

  // Bonus card
  slide.addShape('roundRect', {
    x: RIGHT_CARD_X, y: 2, w: 2.8, h: 3.4,
    fill: { color: '1A0A0F' },
    line: { color: COLORS.SIGNAL_RED, width: 2 },
    rectRadius: 0.15,
  });

  slide.addText('БОНУС К МОДУЛЮ', {
    x: RIGHT_CARD_INNER, y: 2.15, w: 2.4, h: 0.3,
    fontFace: FONTS.MONO, fontSize: 10,
    color: COLORS.SIGNAL_RED,
  });

  slide.addText('10 промптов', {
    x: RIGHT_CARD_INNER, y: 2.6, w: 2.4, h: 0.5,
    fontFace: FONTS.DISPLAY, fontSize: 24, bold: true,
    color: COLORS.HOLO_WHITE,
  });

  slide.addText('Готовые шаблоны', {
    x: RIGHT_CARD_INNER, y: 3.1, w: 2.4, h: 0.35,
    fontFace: FONTS.BODY, fontSize: 14,
    color: COLORS.TECH_GRAY,
  });

  slide.addText('+ Шаблон Memory Bank\n+ Чеклист установки', {
    x: RIGHT_CARD_INNER, y: 3.6, w: 2.4, h: 0.8,
    fontFace: FONTS.BODY, fontSize: 13,
    color: COLORS.HOLO_WHITE,
    lineSpacing: 18,
  });

  addFooter(slide);
}

function createSlide10Results(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addLogo(slide);
  addTitle(slide, 'РЕЗУЛЬТАТ МОДУЛЯ', { y: 0.6 });

  const results = [
    { icon: 'ENV', title: 'Настроенное окружение', desc: 'VS Code + Kilo Code' },
    { icon: 'GIT', title: 'Навыки Git', desc: 'Сохранение и откат' },
    { icon: '>>', title: 'Умение писать промпты', desc: 'Общение с AI' },
    { icon: '#', title: 'ГОТОВЫЙ ПРОЕКТ', desc: 'Калькулятор!', highlight: true },
  ];

  const cardW = 3.3;
  const cardH = 1.4;
  const gap = 0.3;

  results.forEach((result, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = CONTENT_START + col * (cardW + gap);
    const y = 1.6 + row * (cardH + gap);

    if (result.highlight) {
      slide.addShape('roundRect', {
        x, y, w: cardW, h: cardH,
        fill: { color: COLORS.ACID_15 },
        line: { color: COLORS.CYBER_ACID, width: 2 },
        rectRadius: 0.12,
      });
    } else {
      addCard(slide, x, y, cardW, cardH);
    }

    // Icon
    slide.addText(`[${result.icon}]`, {
      x: x + 0.2, y: y + 0.15, w: 1, h: 0.35,
      fontFace: FONTS.MONO, fontSize: 14,
      color: result.highlight ? COLORS.CYBER_ACID : COLORS.TECH_GRAY,
    });

    // Title
    slide.addText(result.title, {
      x: x + 0.2, y: y + 0.55, w: cardW - 0.4, h: 0.4,
      fontFace: FONTS.BODY, fontSize: 16, bold: true,
      color: result.highlight ? COLORS.CYBER_ACID : COLORS.HOLO_WHITE,
    });

    // Description
    slide.addText(result.desc, {
      x: x + 0.2, y: y + 0.95, w: cardW - 0.4, h: 0.3,
      fontFace: FONTS.BODY, fontSize: 12,
      color: COLORS.TECH_GRAY,
    });
  });

  // Ready badge
  slide.addText('+ ГОТОВ К МОДУЛЮ 2', {
    x: CONTENT_START + CONTENT_WIDTH - 2.5, y: 4.8, w: 2.5, h: 0.4,
    fontFace: FONTS.MONO, fontSize: 14, bold: true,
    color: COLORS.CYBER_ACID,
    align: 'right',
  });

  addFooter(slide);
}

function createSlide11LetsGo(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.CYBER_VOID };

  addLogo(slide);

  // Module label
  slide.addText('МОДУЛЬ 1 // БЫСТРЫЙ СТАРТ', {
    x: CONTENT_START, y: 1.5, w: CONTENT_WIDTH, h: 0.4,
    fontFace: FONTS.MONO, fontSize: 16,
    color: COLORS.CYBER_ACID,
  });

  // Main title
  slide.addText('ПОЕХАЛИ!', {
    x: CONTENT_START, y: 2.2, w: CONTENT_WIDTH, h: 1.2,
    fontFace: FONTS.DISPLAY, fontSize: 80, bold: true,
    color: COLORS.HOLO_WHITE,
  });

  // Subtitle
  slide.addText('Начинаем с урока 1.1', {
    x: CONTENT_START, y: 3.5, w: CONTENT_WIDTH, h: 0.5,
    fontFace: FONTS.BODY, fontSize: 20,
    color: COLORS.TECH_GRAY,
  });

  // CTA Button
  slide.addShape('roundRect', {
    x: CONTENT_START, y: 4.3, w: 4, h: 0.65,
    fill: { color: COLORS.CYBER_ACID },
    rectRadius: 0.12,
  });
  slide.addText('ЧТО ТАКОЕ VIBE CODING ->', {
    x: CONTENT_START, y: 4.3, w: 4, h: 0.65,
    fontFace: FONTS.BODY, fontSize: 16, bold: true,
    color: COLORS.CYBER_VOID,
    align: 'center', valign: 'middle',
  });

  // Progress dots
  slide.addText('*  o  o  o  o  o', {
    x: CONTENT_START, y: 5.3, w: 4, h: 0.4,
    fontFace: FONTS.BODY, fontSize: 18,
    color: COLORS.CYBER_ACID,
  });
  slide.addText('6 уроков', {
    x: CONTENT_START + 2.2, y: 5.35, w: 2, h: 0.3,
    fontFace: FONTS.MONO, fontSize: 11,
    color: COLORS.TECH_GRAY,
  });

  addFooter(slide, 'VIBE CODING STARTER // LETS GO');
}

// ============================================================================
// MAIN
// ============================================================================

async function createPresentation() {
  console.log('Creating VIBE CODING STARTER presentation...');
  console.log('Layout: 40% camera zone | 60% content\n');

  const pptx = new pptxgen();

  pptx.layout = 'LAYOUT_16x9';
  pptx.title = 'VIBE CODING STARTER - Module 1';
  pptx.author = 'onAI Academy';
  pptx.company = 'onAI Digital Academy';

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

  const outputPath = path.join(__dirname, 'VIBE_CODING_MODULE1_OBS.pptx');

  try {
    await pptx.writeFile({ fileName: outputPath });
    console.log(`\n[OK] Presentation saved: ${outputPath}`);
    console.log('\nLayout structure:');
    console.log('  [  40% CAMERA  |  60% CONTENT  ]');
    console.log('  [   (empty)    |   slides      ]');
  } catch (err) {
    console.error('Error:', err);
  }
}

createPresentation();
