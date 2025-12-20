export function webinarInviteEmail(recipientName: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Финальный эфир сегодня!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #00FF88 0%, #00CC6A 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #000000; font-size: 28px; font-weight: 700;">
                🔥 Финальный эфир сегодня!
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Привет, ${recipientName}!
              </p>
              
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Сегодня в <strong>20:00</strong> стартует финальный прямой эфир по итогам экспресс-курса! 🚀
              </p>
              
              <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                Расскажу как мы с командой создали IT-платформу за <strong>$20,000</strong> и что ты можешь из этого взять для своих проектов.
              </p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid #00FF88; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0 0 10px; color: #333333; font-size: 15px; font-weight: 600;">
                  📅 Дата: 20 декабря 2024
                </p>
                <p style="margin: 0 0 10px; color: #333333; font-size: 15px; font-weight: 600;">
                  ⏰ Время: 20:00 (UTC+5, Астана)
                </p>
                <p style="margin: 0; color: #333333; font-size: 15px; font-weight: 600;">
                  👥 Ведущие: Диас Серекбай и Александр Декскаймер
                </p>
              </div>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://start.bizon365.ru/room/196985/rejUuP-7-x" 
                       style="display: inline-block; background: linear-gradient(135deg, #00FF88 0%, #00CC6A 100%); color: #000000; text-decoration: none; padding: 18px 50px; border-radius: 8px; font-size: 18px; font-weight: 700; box-shadow: 0 4px 12px rgba(0,255,136,0.3); transition: all 0.3s;">
                      🎯 Войти на эфир
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                До встречи на эфире! 💪
              </p>
              
              <p style="margin: 20px 0 0; color: #333333; font-size: 16px; line-height: 1.6;">
                —<br>
                <strong>Александр</strong><br>
                <span style="color: #666666;">onAI Academy</span>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #666666; font-size: 13px;">
                © 2024 onAI Academy. Все права защищены.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
