/**
 * 📧 EMAIL TEMPLATE: Перенос эфира с 18 на 20 декабря
 * 
 * Дизайн: onAI Academy brand style
 * Адаптация: Dark/Light mode (mobile + desktop)
 * Отправка: Resend API
 */

interface StreamPostponedEmailParams {
  recipientName?: string;
  recipientEmail: string;
}

export const tripwireStreamPostponedEmail = ({
  recipientName,
  recipientEmail,
}: StreamPostponedEmailParams): string => {
  const name = recipientName || 'Студент';

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>⚡ Важно: эфир переносится на субботу</title>
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
    .highlight-box {
      background: rgba(0, 255, 136, 0.1);
      border-left: 4px solid #00FF88;
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
      .highlight-box {
        background: rgba(0, 255, 136, 0.08);
        border-left: 4px solid #00cc6e;
      }
      .text-primary { color: #1a1a1a; }
      .text-secondary { color: #666666; }
      .text-accent { color: #00cc6e; }
      .btn-primary {
        background: linear-gradient(135deg, #00FF88 0%, #00cc6e 100%) !important;
        color: #000000 !important;
      }
    }

    /* 📱 MOBILE RESPONSIVE */
    @media only screen and (max-width: 600px) {
      .email-container { padding: 16px 12px !important; }
      .content-box { padding: 20px 16px !important; }
      h1 { font-size: 28px !important; }
      .emoji-large { font-size: 48px !important; }
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

              <!-- ⚡ EMOJI ALERT -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <div class="emoji-large" style="font-size: 64px; line-height: 1;">⚡</div>
                  </td>
                </tr>
              </table>

              <!-- 📋 MAIN TITLE -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <h2 class="text-primary" style="margin: 0; font-size: 28px; font-weight: 700; line-height: 1.3;">
                      Важное изменение:<br/>Эфир переносится на субботу
                    </h2>
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

              <!-- 📢 MAIN MESSAGE -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p class="text-secondary" style="margin: 0; font-size: 16px; line-height: 1.6;">
                      У нас важная новость: <strong class="text-accent">Заключительный прямой эфир переносится</strong> 
                      с сегодняшнего вечера на <strong class="text-accent">субботу, 20 декабря</strong>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- 🗓️ NEW DATE HIGHLIGHT BOX -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="content-box" style="border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td class="highlight-box" style="padding: 20px; border-radius: 12px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #00FF88; text-transform: uppercase; letter-spacing: 1px;">
                            📅 Новая дата и время
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p class="text-primary" style="margin: 0; font-size: 22px; font-weight: 700; line-height: 1.4;">
                            Суббота, 20 декабря<br/>
                            🕐 20:00 (по Алматы)
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- 🎯 WHY POSTPONED -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <p class="text-secondary" style="margin: 0; font-size: 16px; line-height: 1.6;">
                      <strong class="text-primary">Почему переносим?</strong><br/>
                      Мы хотим, чтобы максимальное количество студентов успели пройти все модули и подготовиться к эфиру. 
                      Так вы получите <strong class="text-accent">в 10 раз больше пользы</strong> от прямого эфира!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- ✅ WHAT TO DO NOW -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="content-box" style="border-radius: 12px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px; border-radius: 12px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <p style="margin: 0; font-size: 18px; font-weight: 700; color: #00FF88;">
                            🎯 Что делать до субботы?
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="padding: 8px 0;">
                                <p class="text-secondary" style="margin: 0; font-size: 15px;">
                                  <strong class="text-primary">✅ Пройди все 3 модуля</strong><br/>
                                  <span style="color: #808080; font-size: 14px;">Это займёт 2-3 часа, зато ты всё поймёшь на эфире</span>
                                </p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <p class="text-secondary" style="margin: 0; font-size: 15px;">
                                  <strong class="text-primary">📝 Выполни домашние задания</strong><br/>
                                  <span style="color: #808080; font-size: 14px;">Так ты закрепишь знания и будешь готов к практике</span>
                                </p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <p class="text-secondary" style="margin: 0; font-size: 15px;">
                                  <strong class="text-primary">💡 Подготовь вопросы для эфира</strong><br/>
                                  <span style="color: #808080; font-size: 14px;">На эфире мы ответим на всё, что тебя интересует</span>
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

              <!-- 🚀 CTA BUTTON -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 32px 0;">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, #00FF88 0%, #00cc6e 100%); box-shadow: 0 4px 20px rgba(0, 255, 136, 0.4);">
                          <a href="https://onai.academy/integrator" target="_blank" class="btn-primary" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 700; color: #000000; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">
                            🎓 ПРОЙТИ МОДУЛИ СЕЙЧАС
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 12px 0 0 0; font-size: 12px; color: #808080; font-style: italic;">
                      * У тебя есть 2 дня, чтобы подготовиться к эфиру!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- ⏰ COUNTDOWN -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 24px 0; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                    <p class="text-secondary" style="margin: 0; font-size: 14px;">
                      ⏰ <strong class="text-accent">До эфира осталось 2 дня</strong> — успей пройти все модули!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- 👋 FOOTER -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                    <p class="text-secondary" style="margin: 0 0 8px 0; font-size: 14px;">
                      До встречи на эфире! 🚀
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
