"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateProftestResultEmail = generateProftestResultEmail;
function generateProftestResultEmail(name, productUrl) {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Тест пройден</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background-color: #030303;
      color: #ffffff;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #030303;
    }
    .header {
      background: linear-gradient(135deg, #00FF94 0%, #00CC75 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      font-size: 32px;
      font-weight: 800;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .content {
      padding: 40px 20px;
      background-color: #0A0A0A;
    }
    .greeting {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 20px;
      color: #ffffff;
    }
    .message {
      font-size: 16px;
      color: #CCCCCC;
      margin-bottom: 30px;
      line-height: 1.8;
    }
    .button-container {
      text-align: center;
      margin: 40px 0;
    }
    .cta-button {
      display: inline-block;
      background: #00FF94;
      color: #000000 !important;
      text-decoration: none;
      padding: 18px 40px;
      font-size: 18px;
      font-weight: 700;
      border-radius: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(0, 255, 148, 0.3);
    }
    .cta-button:hover {
      background: #00CC75;
      box-shadow: 0 6px 30px rgba(0, 255, 148, 0.5);
      transform: translateY(-2px);
    }
    .features {
      background-color: #0F0F0F;
      border: 1px solid rgba(0, 255, 148, 0.2);
      border-radius: 8px;
      padding: 30px;
      margin: 30px 0;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .feature-item:last-child {
      margin-bottom: 0;
    }
    .feature-icon {
      font-size: 24px;
      margin-right: 15px;
      flex-shrink: 0;
    }
    .feature-text {
      font-size: 15px;
      color: #CCCCCC;
    }
    .footer {
      padding: 30px 20px;
      text-align: center;
      background-color: #030303;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .footer-text {
      font-size: 14px;
      color: #666666;
      margin-bottom: 10px;
    }
    .footer-link {
      color: #00FF94;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(0, 255, 148, 0.3), transparent);
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo">OnAI Academy</div>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="greeting">Привет${name ? ', ' + name : ''}! 👋</div>
      
      <div class="message">
        Поздравляем! Вы успешно прошли профессиональный тест на готовность к работе с AI.
      </div>

      <div class="divider"></div>

      <div class="features">
        <div class="feature-item">
          <div class="feature-icon">✅</div>
          <div class="feature-text">
            <strong>Ваши результаты обработаны</strong><br>
            Наша система проанализировала ваши ответы и подготовила персональное предложение.
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">🎯</div>
          <div class="feature-text">
            <strong>Специальное предложение готово</strong><br>
            Получите доступ к эксклюзивному продукту, который поможет вам монетизировать AI навыки.
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">⚡</div>
          <div class="feature-text">
            <strong>Ограниченное предложение</strong><br>
            Не упустите возможность начать зарабатывать с помощью AI уже сегодня.
          </div>
        </div>
      </div>

      <div class="button-container">
        <a href="${productUrl}" class="cta-button">
          Получить продукт →
        </a>
      </div>

      <div class="message" style="margin-top: 30px; font-size: 14px; color: #888888;">
        Если кнопка не работает, скопируйте эту ссылку в браузер:<br>
        <a href="${productUrl}" style="color: #00FF94; word-break: break-all;">${productUrl}</a>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-text">
        © ${new Date().getFullYear()} OnAI Academy. Все права защищены.
      </div>
      <div class="footer-text">
        Вопросы? Напишите нам: <a href="mailto:support@onai.academy" class="footer-link">support@onai.academy</a>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
