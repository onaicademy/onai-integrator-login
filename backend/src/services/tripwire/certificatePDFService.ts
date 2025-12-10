/**
 * Certificate PDF Generation Service using Puppeteer
 * Генерирует профессиональные PDF сертификаты с правильным дизайном из CertificatePreview.tsx
 */

import puppeteer, { Browser } from 'puppeteer';

interface CertificateData {
  userName: string;
  courseTitle: string;
  completionDate: string;
  certificateNumber: string;
}

export class CertificatePDFService {
  private browser: Browser | null = null;

  /**
   * Получить или создать экземпляр браузера Puppeteer
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      console.log('🌐 [PDF] Launching Puppeteer browser...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
        ],
      });
    }
    return this.browser;
  }

  /**
   * Генерировать HTML template для сертификата
   * ИСПОЛЬЗУЕТ ТОЧНЫЙ КОД ИЗ CertificatePreview.tsx!
   */
  private generateHTMLTemplate(data: CertificateData): string {
    return `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Certificate - ${data.userName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Manrope:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Space Grotesk', 'Arial', sans-serif;
            background: #030303;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 0;
            margin: 0;
          }

          .container {
            width: 1200px;
            height: 848px;
            background: radial-gradient(ellipse at 15% 50%, #151515 0%, #2C2A2A 69%, #1F1F1F 100%);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }
          
          svg {
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <svg width="1200" height="848" viewBox="0 0 1200 848" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
            <defs>
              <!-- Градиенты - НОВЫЙ ФОН -->
              <radialGradient id="bgGradient" cx="15%" cy="50%">
                <stop offset="0%" style="stop-color:#151515;stop-opacity:1" />
                <stop offset="69%" style="stop-color:#2C2A2A;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#1F1F1F;stop-opacity:1" />
              </radialGradient>
              
              <linearGradient id="greenGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#00FF94;stop-opacity:0.6" />
                <stop offset="50%" style="stop-color:#00FF94;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#00CC6A;stop-opacity:0.6" />
              </linearGradient>

              <radialGradient id="glowEffect" cx="50%" cy="50%">
                <stop offset="0%" style="stop-color:#00FF94;stop-opacity:0.2" />
                <stop offset="100%" style="stop-color:#00FF94;stop-opacity:0" />
              </radialGradient>

              <!-- Фильтры -->
              <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood flood-color="#00FF94" flood-opacity="0.6" />
                <feComposite in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <!-- Паттерн для сетки -->
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00FF94" stroke-width="0.5" opacity="0.05"/>
              </pattern>
            </defs>

            <!-- Фон -->
            <rect width="1200" height="848" fill="url(#bgGradient)" />
            
            <!-- Сетка фона -->
            <rect width="1200" height="848" fill="url(#grid)" opacity="0.3" />

            <!-- Декоративные угловые элементы -->
            <!-- Верхний левый угол -->
            <g opacity="0.8">
              <line x1="20" y1="20" x2="20" y2="100" stroke="#00FF94" stroke-width="3" />
              <line x1="20" y1="20" x2="100" y2="20" stroke="#00FF94" stroke-width="3" />
              <circle cx="20" cy="20" r="4" fill="#00FF94" />
            </g>

            <!-- Верхний правый угол -->
            <g opacity="0.8">
              <line x1="1180" y1="20" x2="1180" y2="100" stroke="#00FF94" stroke-width="3" />
              <line x1="1180" y1="20" x2="1100" y2="20" stroke="#00FF94" stroke-width="3" />
              <circle cx="1180" cy="20" r="4" fill="#00FF94" />
            </g>

            <!-- Нижний левый угол -->
            <g opacity="0.8">
              <line x1="20" y1="828" x2="20" y2="748" stroke="#00FF94" stroke-width="3" />
              <line x1="20" y1="828" x2="100" y2="828" stroke="#00FF94" stroke-width="3" />
              <circle cx="20" cy="828" r="4" fill="#00FF94" />
            </g>

            <!-- Нижний правый угол -->
            <g opacity="0.8">
              <line x1="1180" y1="828" x2="1180" y2="748" stroke="#00FF94" stroke-width="3" />
              <line x1="1180" y1="828" x2="1100" y2="828" stroke="#00FF94" stroke-width="3" />
              <circle cx="1180" cy="828" r="4" fill="#00FF94" />
            </g>

            <!-- Логотип onAI Academy - ПРАВИЛЬНЫЙ SVG из OnAILogo.tsx -->
            <g transform="translate(30, 40) scale(0.08)">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M542.885 252.305H316.89C242.085 252.305 181.292 314.133 181.292 390.211C181.292 466.288 242.085 528.116 316.89 528.116H542.885C617.689 528.116 678.482 466.288 678.482 390.211C678.482 314.133 617.689 252.305 542.885 252.305ZM542.885 482.148H316.89C266.945 482.148 226.491 441.006 226.491 390.211C226.491 339.415 266.945 298.274 316.89 298.274H542.885C592.829 298.274 633.283 339.415 633.283 390.211C633.283 441.006 592.829 482.148 542.885 482.148Z" fill="#00FF88" />
              <circle cx="542.885" cy="390.211" r="60" fill="#00FF88" stroke="#00FF88" stroke-width="5" />
              <path d="M958.148 241.667C1000.74 241.667 1033.64 255.344 1056.84 282.7C1080.38 310.055 1092.15 354.897 1092.15 417.226V534.092H972.691V418.784C972.691 396.969 971.479 379.136 969.056 365.285C966.632 351.434 960.745 339.834 951.396 330.485C942.046 321.136 927.503 316.461 907.766 316.461C886.989 316.461 871.58 320.963 861.539 329.966C851.497 338.622 845.091 349.876 842.32 363.727C839.55 377.578 838.165 395.757 838.165 418.265V534.092H718.702V251.016H838.165V286.336C864.482 256.556 904.476 241.667 958.148 241.667Z" fill="#FFFFFF" />
              <path d="M1689.08 534.091H1559.75L1523.91 468.126H1306.28L1270.44 534.091H1141.11L1349.39 149.73H1480.8L1689.08 534.091ZM1415.36 267.116L1353.03 381.385H1477.16L1415.36 267.116ZM1828.6 534.091H1700.3V149.73H1828.6V534.091Z" fill="#FFFFFF" />
              <path d="M2301.07 255.864C2301.07 267.078 2298.4 277.17 2293.06 286.141C2287.72 295.112 2280.14 302.161 2270.31 307.288C2260.49 312.414 2249.06 314.977 2236.03 314.977H2179.32V196.43H2235.87C2248.9 196.43 2260.32 198.993 2270.15 204.12C2280.08 209.246 2287.72 216.295 2293.06 225.266C2298.4 234.237 2301.07 244.436 2301.07 255.864ZM2238.91 295.433C2246.92 295.433 2254.02 293.938 2260.22 290.947C2266.52 287.85 2271.43 283.365 2274.96 277.491C2278.59 271.51 2280.4 264.301 2280.4 255.864C2280.4 248.815 2278.59 242.247 2274.96 236.159C2271.43 230.072 2266.47 225.213 2260.06 221.581C2253.76 217.95 2246.71 216.135 2238.91 216.135H2200.14V295.433H2238.91ZM2337.97 314.977H2317.14V196.43H2337.97V314.977ZM2496.09 314.977H2482.95L2479.75 297.676C2473.23 304.19 2465.27 309.263 2455.88 312.894C2446.48 316.419 2436.44 318.181 2425.76 318.181C2412.2 318.181 2399.97 315.458 2389.07 310.011C2378.18 304.564 2369.58 297.142 2363.28 287.743C2357.09 278.238 2353.99 267.612 2353.99 255.864C2353.99 244.009 2357.19 233.383 2363.6 223.984C2370.01 214.479 2378.66 207.057 2389.55 201.717C2400.55 196.377 2412.62 193.707 2425.76 193.707C2435.16 193.707 2444.5 195.309 2453.79 198.513C2463.09 201.717 2471.36 206.63 2478.62 213.251C2485.89 219.873 2491.01 228.096 2494 237.922L2471.9 238.082C2469.33 232.208 2465.49 227.349 2460.36 223.504C2455.24 219.552 2449.58 216.669 2443.38 214.853C2437.29 212.931 2431.47 211.97 2425.92 211.97C2416.2 211.97 2407.44 213.785 2399.65 217.416C2391.96 220.941 2385.87 226.067 2381.38 232.795C2377.01 239.417 2374.82 247.106 2374.82 255.864C2374.82 265.155 2377.11 273.165 2381.7 279.894C2386.4 286.515 2392.65 291.535 2400.45 294.952C2408.24 298.37 2416.73 300.079 2425.92 300.079C2435.53 300.079 2444.61 297.889 2453.15 293.51C2461.7 289.132 2468.16 282.457 2472.54 273.486H2427.68V257.145H2495.45V268.68L2496.09 314.977ZM2532.9 314.977H2512.07V196.43H2532.9V314.977ZM2549.72 214.372V196.43H2681.24L2549.72 214.372ZM2681.24 196.43V214.853H2626.3V314.977H2605.47V214.853H2549.72V196.43H2681.24ZM2803.3 314.977H2780.87L2765.97 287.423H2687.31L2672.42 314.977H2649.99L2714.23 196.43H2739.06L2803.3 314.977ZM2726.72 214.853L2697.89 267.879H2755.4L2726.72 214.853ZM2833.74 196.43V296.875H2918.65V314.977H2812.92V196.43H2833.74ZM2323.02 518.977H2300.59L2285.69 491.423H2207.03L2192.13 518.977H2169.71L2233.95 400.43H2258.78L2323.02 518.977ZM2246.44 418.853L2217.61 471.879H2275.12L2246.44 418.853ZM2319.89 459.864C2319.89 448.009 2323.04 437.329 2329.34 427.824C2335.75 418.319 2344.45 410.897 2355.45 405.557C2366.45 400.11 2378.68 397.386 2392.14 397.386C2408.26 397.386 2422.41 401.391 2434.59 409.401C2446.87 417.411 2455.73 428.785 2461.18 443.524L2439.39 443.844C2437.15 437.863 2433.36 432.737 2428.02 428.465C2422.68 424.193 2416.75 420.989 2410.24 418.853C2403.83 416.61 2397.85 415.489 2392.3 415.489C2383.97 415.489 2375.79 417.251 2367.79 420.775C2359.88 424.193 2353.37 429.266 2348.24 435.994C2343.22 442.723 2340.71 450.679 2340.71 459.864C2340.71 469.262 2343.06 477.272 2347.76 483.894C2352.46 490.515 2358.71 495.535 2366.5 498.952C2374.41 502.37 2383 504.079 2392.3 504.079C2397.74 504.079 2403.46 503.064 2409.44 501.035C2415.42 498.899 2421.02 495.748 2426.26 491.583C2431.49 487.418 2435.66 482.345 2438.75 476.364H2461.34C2455.36 491.316 2446.34 502.69 2434.27 510.487C2422.31 518.283 2408.26 522.181 2392.14 522.181C2378.79 522.181 2366.56 519.458 2355.45 514.011C2344.45 508.564 2335.75 501.088 2329.34 491.583C2323.04 482.078 2319.89 471.505 2319.89 459.864ZM2614.63 518.977H2592.2L2577.3 491.423H2498.64L2483.74 518.977H2461.32L2525.56 400.43H2550.39L2614.63 518.977ZM2538.05 418.853L2509.22 471.879H2566.73L2538.05 418.853ZM2745.99 459.864C2745.99 471.078 2743.32 481.17 2737.98 490.141C2732.64 499.112 2725.06 506.161 2715.24 511.288C2705.41 516.414 2693.98 518.977 2680.95 518.977H2624.24V400.43H2680.79C2693.82 400.43 2705.25 402.993 2715.08 408.12C2725.01 413.246 2732.64 420.295 2737.98 429.266C2743.32 438.237 2745.99 448.436 2745.99 459.864ZM2683.84 499.433C2691.85 499.433 2698.95 497.938 2705.14 494.947C2711.45 491.85 2716.36 487.365 2719.88 481.491C2723.51 475.51 2725.33 468.301 2725.33 459.864C2725.33 452.815 2723.51 446.247 2719.88 440.159C2716.36 434.072 2711.39 429.213 2704.98 425.581C2698.68 421.95 2691.63 420.135 2683.84 420.135H2645.07V499.433H2683.84ZM2867.16 466.112H2782.9V501.195L2880.62 500.554V518.977H2762.07V400.43H2880.62L2880.78 418.853H2782.9V447.689H2867.16V466.112ZM3047.18 400.43V518.977H3026.35V434.553L2985.18 518.977H2962.59L2918.38 433.111V518.977H2897.55V400.43H2924.14L2973.65 496.389L3020.42 400.43H3047.18ZM3171.92 400.43H3198.36L3140.85 468.995V518.977H3117.62V469.316L3059.95 400.43H3086.38L3128.83 452.014L3171.92 400.43Z" fill="#FFFFFF" />
              <path d="M2015.73 153.979L2015.73 531.927" stroke="#FFFFFF" stroke-width="15.6024" />
            </g>

            <!-- Светящийся круг в центре -->
            <circle cx="600" cy="280" r="120" fill="url(#glowEffect)" opacity="0.4" />

            <!-- Заголовок "СЕРТИФИКАТ" -->
            <text x="600" y="200" text-anchor="middle" fill="url(#greenGlow)" font-size="24" font-family="JetBrains Mono, monospace" letter-spacing="8" filter="url(#neonGlow)">
              СЕРТИФИКАТ О ЗАВЕРШЕНИИ
            </text>

            <!-- Декоративная линия под заголовком -->
            <line x1="400" y1="220" x2="800" y2="220" stroke="#00FF94" stroke-width="1" opacity="0.3" />

            <!-- ИМЯ СТУДЕНТА -->
            <text x="600" y="330" text-anchor="middle" fill="#FFFFFF" font-size="64" font-family="Space Grotesk, sans-serif" font-weight="bold" letter-spacing="4" text-transform="uppercase">
              ${data.userName.toUpperCase()}
            </text>

            <!-- Описание -->
            <text x="600" y="390" text-anchor="middle" fill="#9CA3AF" font-size="20" font-family="Manrope, sans-serif">
              успешно завершил(а) интенсивный курс
            </text>

            <!-- Название курса -->
            <text x="600" y="450" text-anchor="middle" fill="#FFFFFF" font-size="36" font-family="Space Grotesk, sans-serif" font-weight="bold" letter-spacing="4">
              ${data.courseTitle.toUpperCase()}
            </text>

            <!-- Декоративная линия -->
            <line x1="300" y1="480" x2="900" y2="480" stroke="#00FF94" stroke-width="1" opacity="0.2" />

            <!-- Дополнительное описание -->
            <text x="600" y="520" text-anchor="middle" fill="#666666" font-size="16" font-family="Manrope, sans-serif">
              Освоение основ искусственного интеллекта и практических навыков
            </text>
            <text x="600" y="545" text-anchor="middle" fill="#666666" font-size="16" font-family="Manrope, sans-serif">
              работы с нейросетями и AI-инструментами
            </text>

            <!-- Подписи директоров -->
            <g transform="translate(120, 650)">
              <line x1="0" y1="0" x2="160" y2="0" stroke="#333333" stroke-width="1.5" />
              <text x="80" y="25" text-anchor="middle" fill="#666666" font-size="13" font-family="Manrope, sans-serif">
                Директор onAI Academy
              </text>
              <text x="80" y="45" text-anchor="middle" fill="#9CA3AF" font-size="10" font-family="JetBrains Mono, monospace">
                Александр Тарарушкин
              </text>
            </g>

            <!-- Вторая подпись директора -->
            <g transform="translate(920, 650)">
              <line x1="0" y1="0" x2="160" y2="0" stroke="#333333" stroke-width="1.5" />
              <text x="80" y="25" text-anchor="middle" fill="#666666" font-size="13" font-family="Manrope, sans-serif">
                Директор onAI Academy
              </text>
              <text x="80" y="45" text-anchor="middle" fill="#9CA3AF" font-size="10" font-family="JetBrains Mono, monospace">
                Диас Серекбай
              </text>
            </g>

            <!-- Дата выдачи -->
            <g transform="translate(500, 650)">
              <line x1="0" y1="0" x2="200" y2="0" stroke="#333333" stroke-width="1.5" />
              <text x="100" y="25" text-anchor="middle" fill="#666666" font-size="13" font-family="Manrope, sans-serif">
                Дата выдачи
              </text>
              <text x="100" y="45" text-anchor="middle" fill="#9CA3AF" font-size="13" font-family="JetBrains Mono, monospace" font-weight="500">
                ${data.completionDate}
              </text>
            </g>

            <!-- Номер сертификата -->
            <text x="600" y="760" text-anchor="middle" fill="#333333" font-size="12" font-family="JetBrains Mono, monospace" letter-spacing="2">
              ${data.certificateNumber}
            </text>
          </svg>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Генерировать PDF из данных сертификата
   */
  async generatePDF(data: CertificateData): Promise<Buffer> {
    const startTime = Date.now();
    console.log(`📄 [PDF] Generating for ${data.userName}...`);

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Устанавливаем размер страницы A4 Landscape
      await page.setViewport({
        width: 1200,
        height: 848,
        deviceScaleFactor: 2, // Для лучшего качества PDF
      });

      // Генерируем HTML контент
      const htmlContent = this.generateHTMLTemplate(data);

      // Загружаем HTML контент
      await page.setContent(htmlContent, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000,
      });

      // Ждем загрузки шрифтов
      await page.evaluateHandle('document.fonts.ready');

      // Генерируем PDF
      const pdfData = await page.pdf({
        width: '1200px',
        height: '848px',
        printBackground: true,
        preferCSSPageSize: true,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ [PDF] Generated in ${duration}ms`);

      return Buffer.from(pdfData);
    } finally {
      await page.close();
    }
  }

  /**
   * Закрыть браузер Puppeteer
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('🔒 [PDF] Browser closed');
    }
  }
}

// Export singleton
export const certificatePDFService = new CertificatePDFService();
