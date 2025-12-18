/**
 * 📧 УНИВЕРСАЛЬНЫЙ EMAIL ШАБЛОН для массовых рассылок
 * 
 * Дизайн: onAI Academy brand style
 * Адаптация: Dark/Light mode (mobile + desktop)
 * Отправка: Resend API
 */

interface UniversalBroadcastEmailParams {
  recipientName?: string;
  recipientEmail: string;
  subject: string;
  message: string;
}

export const universalBroadcastEmail = ({
  recipientName,
  recipientEmail,
  subject,
  message,
}: UniversalBroadcastEmailParams): string => {
  const name = recipientName || 'Студент';

  // Конвертируем простой текст в HTML с параграфами
  const htmlMessage = message
    .split('\n\n')
    .map(paragraph => `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;">${paragraph.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${subject}</title>
  <style>
    /* 🎨 RESET */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #0a0a0a;
      color: #ffffff;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    /* 🌗 DARK MODE (default) */
    .email-container {
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      color: #ffffff;
    }
    .content-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(0, 255, 136, 0.2);
    }
    .text-primary { color: #ffffff; }
    .text-secondary { color: #b0b0b0; }
    .text-accent { color: #00FF88; }

    /* ☀️ LIGHT MODE */
    @media (prefers-color-scheme: light) {
      body { background: #f5f5f5; color: #1a1a1a; }
      .email-container {
        background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
        color: #1a1a1a;
      }
      .content-box {
        background: #ffffff;
        border: 1px solid #e0e0e0;
      }
      .text-primary { color: #1a1a1a; }
      .text-secondary { color: #666666; }
      .text-accent { color: #00cc6e; }
    }

    /* 📱 MOBILE RESPONSIVE */
    @media only screen and (max-width: 600px) {
      .email-container { padding: 16px 12px !important; }
      .content-box { padding: 20px 16px !important; }
      h1 { font-size: 28px !important; }
    }
  </style>
</head>
<body>
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px;" class="email-container">
          <tr>
            <td style="padding: 40px 30px; border-radius: 16px;">
              
              <!-- 🎯 HEADER: Logo -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <h1 style="margin: 0; font-size: 36px; font-weight: 700; color: #00FF88; letter-spacing: 2px; text-shadow: 0 0 30px rgba(0, 255, 136, 0.6);">
                      onAI Academy
                    </h1>
                  </td>
                </tr>
              </table>

              <!-- 🎯 GREETING -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p class="text-primary" style="margin: 0; font-size: 16px; line-height: 1.6;">
                      Привет, ${name}!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- 📋 MAIN MESSAGE -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="text-secondary">
                    ${htmlMessage}
                  </td>
                </tr>
              </table>

              <!-- 👋 FOOTER -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                    <p class="text-secondary" style="margin: 0 0 8px 0; font-size: 14px;">
                      С уважением,
                    </p>
                    <p class="text-secondary" style="margin: 0; font-size: 14px;">
                      <strong class="text-primary">Команда onAI Academy</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- 📞 SUPPORT -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-top: 32px;">
                    <p style="margin: 0; font-size: 12px; color: #808080; line-height: 1.6;">
                      Вопросы? Пиши в поддержку:<br/>
                      <a href="mailto:support@onai.academy" style="color: #00FF88; text-decoration: none;">support@onai.academy</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};
