/**
 * 🔄 TRIPWIRE: Email уведомление о доступе + инструкция очистки кэша
 * Bulletproof HTML email template для всех email клиентов
 */

export function generateCacheResetEmail(studentName: string): string {
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Доступ к AI Интегратор открыт!</title>
  <style type="text/css">
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif; }
    table { border-collapse: collapse; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0A;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0A0A0A;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- MAIN CONTAINER -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background: linear-gradient(135deg, #0F0F0F 0%, #1A1A1A 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(0, 255, 136, 0.2);">
          
          <!-- HEADER WITH NEON GLOW -->
          <tr>
            <td align="center" style="padding: 40px 20px; background: linear-gradient(180deg, rgba(0, 255, 136, 0.1) 0%, rgba(0, 0, 0, 0) 100%);">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- LOGO PLACEHOLDER -->
                    <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #00FF88 0%, #00CC6A 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 40px rgba(0, 255, 136, 0.5);">
                      <span style="font-size: 40px; color: #000;">🚀</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 20px rgba(0, 255, 136, 0.3);">
                      ДОСТУП ОТКРЫТ!
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- GREETING -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <p style="margin: 0; font-size: 18px; color: #FFFFFF; font-weight: 600;">
                Привет, ${studentName}! 👋
              </p>
            </td>
          </tr>

          <!-- MAIN MESSAGE -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #E0E0E0;">
                Отличные новости! Вам открыт <strong style="color: #00FF88;">полный доступ</strong> к продукту <strong style="color: #00FF88;">AI Интегратор</strong>.
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #E0E0E0;">
                Теперь вы можете проходить все 3 модуля курса, получить сертификат и принять участие в завершающем эфире!
              </p>
            </td>
          </tr>

          <!-- IMPORTANT NOTICE BOX -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: rgba(0, 255, 136, 0.1); border-left: 4px solid #00FF88; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #00FF88; text-transform: uppercase; letter-spacing: 1px;">
                      ⚠️ Важно!
                    </p>
                    <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #FFFFFF;">
                      Чтобы изменения вступили в силу, необходимо <strong>очистить кэш браузера</strong> и заново войти на платформу.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- STEP-BY-STEP INSTRUCTIONS -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; letter-spacing: 1px;">
                📋 Инструкция (3 простых шага):
              </h2>
              
              <!-- STEP 1 -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                <tr>
                  <td style="padding: 15px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="40" style="vertical-align: top;">
                          <div style="width: 32px; height: 32px; background: #00FF88; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 18px; font-weight: 700; color: #000;">1</span>
                          </div>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #FFFFFF;">
                            Очистите кэш браузера
                          </p>
                          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #B0B0B0;">
                            <strong style="color: #00FF88;">Способ 1 (быстрый):</strong> Перейдите по ссылке ниже<br/>
                            <strong style="color: #00FF88;">Способ 2:</strong> В Google Chrome: Настройки → Конфиденциальность → Очистить данные браузера → Файлы cookie и изображения<br/>
                            <strong style="color: #00FF88;">Способ 3:</strong> Поищите в Google "как очистить кэш в [название вашего браузера]"
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- STEP 2 -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                <tr>
                  <td style="padding: 15px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="40" style="vertical-align: top;">
                          <div style="width: 32px; height: 32px; background: #00FF88; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 18px; font-weight: 700; color: #000;">2</span>
                          </div>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #FFFFFF;">
                            Выйдите из аккаунта
                          </p>
                          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #B0B0B0;">
                            Нажмите на свой профиль → "Выйти" (или просто закройте все вкладки с платформой)
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- STEP 3 -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                <tr>
                  <td style="padding: 15px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="40" style="vertical-align: top;">
                          <div style="width: 32px; height: 32px; background: #00FF88; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 18px; font-weight: 700; color: #000;">3</span>
                          </div>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #FFFFFF;">
                            Войдите заново
                          </p>
                          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #B0B0B0;">
                            Перейдите на платформу и войдите с вашими данными. Все модули будут открыты!
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA BUTTON: CLEAR CACHE -->
          <tr>
            <td align="center" style="padding: 0 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #00FF88 0%, #00CC6A 100%); border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 255, 136, 0.4);">
                    <a href="https://expresscourse.onai.academy/clear-cache.html" target="_blank" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 700; color: #000000; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">
                      🔄 ОЧИСТИТЬ КЭШ (ШАГ 1)
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA BUTTON: LOGIN -->
          <tr>
            <td align="center" style="padding: 0 40px 40px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background: rgba(255, 255, 255, 0.1); border: 2px solid #00FF88; border-radius: 12px;">
                    <a href="https://expresscourse.onai.academy" target="_blank" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 700; color: #00FF88; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">
                      🚀 ВОЙТИ НА ПЛАТФОРМУ (ШАГ 3)
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- WHAT'S NEXT -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <h2 style="margin: 0 0 15px; font-size: 18px; font-weight: 700; color: #FFFFFF;">
                🎯 Что вас ждёт:
              </h2>
              <ul style="margin: 0; padding-left: 20px; color: #E0E0E0; font-size: 15px; line-height: 1.8;">
                <li><strong style="color: #00FF88;">Модуль 1:</strong> Определение направления в AI</li>
                <li><strong style="color: #00FF88;">Модуль 2:</strong> Создание первого GPT-бота</li>
                <li><strong style="color: #00FF88;">Модуль 3:</strong> Освоение создания вирусных Reels</li>
                <li><strong style="color: #00FF88;">Сертификат:</strong> Подтверждение прохождения курса</li>
                <li><strong style="color: #00FF88;">Финальный эфир:</strong> Разбор вопросов и поддержка</li>
              </ul>
            </td>
          </tr>

          <!-- SUPPORT SECTION -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: rgba(255, 255, 255, 0.03); border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; font-size: 14px; color: #B0B0B0;">
                      💬 <strong style="color: #FFFFFF;">Нужна помощь?</strong>
                    </p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #B0B0B0;">
                      Если возникли сложности с очисткой кэша или входом на платформу — напишите нам в поддержку, мы поможем!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding: 30px 40px; background: rgba(0, 0, 0, 0.3); border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <p style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #FFFFFF;">
                Успехов в обучении! 🚀
              </p>
              <p style="margin: 0; font-size: 13px; color: #808080;">
                © ${new Date().getFullYear()} OnAI Academy. Все права защищены.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
