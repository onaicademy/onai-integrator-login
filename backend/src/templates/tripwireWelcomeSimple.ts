/**
 * 🎯 ПРОСТОЙ EMAIL TEMPLATE - БЕЗ ДИЗАЙНА
 * Работает везде, Gmail не режет
 */

export function getWelcomeEmailHtml(email: string, password: string, name: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
  
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px;">
          
          <tr>
            <td style="padding: 20px; text-align: center;">
              <h1 style="color: #000000; font-size: 24px; margin: 0 0 20px 0;">
                Поздравляем, ${name}!
              </h1>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Вы получили доступ к <strong>Интегратор 3.0</strong>.
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 20px; background-color: #f5f5f5; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px;">Ваш логин:</p>
              <p style="margin: 0 0 20px 0; color: #000000; font-size: 18px; font-weight: bold;">${email}</p>
              
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px;">Ваш пароль:</p>
              <p style="margin: 0 0 20px 0; color: #000000; font-size: 18px; font-weight: bold;">${password}</p>
              
              <p style="margin: 20px 0 0 0; color: #999999; font-size: 12px;">
                🔒 Сохраните эти данные в надежном месте
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px 20px; text-align: center;">
              <a href="https://onai.academy/tripwire/login" 
                 style="display: inline-block; 
                        padding: 15px 40px; 
                        background-color: #00FF94; 
                        color: #000000; 
                        text-decoration: none; 
                        font-size: 16px; 
                        font-weight: bold; 
                        border-radius: 4px;">
                ВОЙТИ В ПЛАТФОРМУ
              </a>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 20px; text-align: center; color: #999999; font-size: 12px;">
              <p style="margin: 0;">onAI Academy — Интегратор 3.0</p>
              <p style="margin: 5px 0 0 0;">&copy; 2025 Все права защищены</p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>`;
}














