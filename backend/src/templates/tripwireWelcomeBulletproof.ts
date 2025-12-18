/**
 * 🔥 BULLETPROOF EMAIL TEMPLATE для Tripwire Welcome
 * 
 * ✅ 100% совместимость с Gmail, Outlook, Apple Mail, Yahoo
 * ✅ Table-based верстка (старая школа, но работает везде)
 * ✅ Без flexbox, transform, сложных CSS
 * ✅ Все стили inline
 * ✅ Безопасные шрифты с fallback
 */

export function getWelcomeEmailHtml(email: string, password: string, name: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Добро пожаловать в Интегратор 3.0</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030303; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  
  <!-- WRAPPER TABLE -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#030303" style="background-color: #030303;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- MAIN CONTENT TABLE -->
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0A0A0A; border: 1px solid #1F1F1F; border-radius: 24px;">
          
          <!-- HEADER WITH LOGO -->
          <tr>
            <td align="center" style="background-color: #000000; padding: 30px 40px; border-bottom: 1px solid #1F1F1F;">
              <img src="https://onai.academy/logo-email.png" alt="onAI Digital Academy" width="250" style="display: block; margin: 0 auto; width: 250px; max-width: 100%; height: auto;" />
            </td>
          </tr>
          
          <!-- MAIN CONTENT -->
          <tr>
            <td style="padding: 40px 30px; color: #E0E0E0; font-size: 16px; line-height: 1.7;">
              
              <!-- GREETING -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-bottom: 15px;">
                    <h1 style="color: #FFFFFF; font-size: 26px; font-weight: 700; text-transform: uppercase; margin: 0; padding: 0; font-family: Arial, sans-serif;">
                      ПОЗДРАВЛЯЕМ, ${name}!
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 25px; color: #E0E0E0; font-size: 16px;">
                    Вы сделали первый шаг к тому, чтобы <strong style="color: #00FF94;">владеть технологиями будущего</strong>.<br/>
                    Интегратор 3.0 — это ваша репетиция перед большой сценой.
                  </td>
                </tr>
              </table>
              
              <!-- FEATURES LIST -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 10px 0 25px 0;">
                <tr>
                  <td style="padding: 10px 0;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="30" valign="top" style="padding-right: 10px;">
                          <span style="color: #00FF94; font-size: 20px; font-weight: bold;">✓</span>
                        </td>
                        <td style="color: #E0E0E0; font-size: 15px; font-weight: 600;">
                          Освоите базовые AI-инструменты на практике
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="30" valign="top" style="padding-right: 10px;">
                          <span style="color: #00FF94; font-size: 20px; font-weight: bold;">✓</span>
                        </td>
                        <td style="color: #E0E0E0; font-size: 15px; font-weight: 600;">
                          Поймёте, как это работает в реальных проектах
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="30" valign="top" style="padding-right: 10px;">
                          <span style="color: #00FF94; font-size: 20px; font-weight: bold;">✓</span>
                        </td>
                        <td style="color: #E0E0E0; font-size: 15px; font-weight: 600;">
                          Подготовитесь к полному курсу, который откроет все возможности
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- MOTIVATIONAL TEXT -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 15px 0 25px 0; color: #E0E0E0; font-size: 15px; line-height: 1.6;">
                    Никакой теории ради теории. Вы получите конкретные инструменты и сразу начнете действовать.
                  </td>
                </tr>
              </table>
              
              <!-- ACCESS ACTIVATED BADGE -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 15px 0 35px 0;">
                    <table border="0" cellspacing="0" cellpadding="0" style="background-color: #00FF94; border-radius: 4px;">
                      <tr>
                        <td style="padding: 12px 25px; color: #000000; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                          ⚡ ДОСТУП АКТИВИРОВАН
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CREDENTIALS BOX -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(15, 15, 15, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px;">
                <tr>
                  <td style="padding: 30px 25px;">
                    
                    <!-- LOGIN -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding-bottom: 6px; color: #888888; font-size: 13px;">
                          Ваш логин:
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom: 20px;">
                          <table border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(0, 255, 148, 0.05); border: 1px solid rgba(0, 255, 148, 0.2); border-radius: 6px;">
                            <tr>
                              <td style="padding: 10px 15px; color: #00FF94; font-size: 18px; font-family: 'Courier New', Courier, monospace; font-weight: 500;">
                                ${email}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- PASSWORD -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding-bottom: 6px; color: #888888; font-size: 13px;">
                          Ваш пароль:
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom: 20px;">
                          <table border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(0, 255, 148, 0.05); border: 1px solid rgba(0, 255, 148, 0.2); border-radius: 6px;">
                            <tr>
                              <td style="padding: 10px 15px; color: #00FF94; font-size: 18px; font-family: 'Courier New', Courier, monospace; font-weight: 500;">
                                ${password}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- WARNING -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding-top: 15px;">
                          <table border="0" cellspacing="0" cellpadding="0" style="border: 1px solid rgba(0, 255, 148, 0.3); border-radius: 4px;">
                            <tr>
                              <td style="padding: 8px 16px; color: #E0E0E0; font-size: 13px; font-weight: 600;">
                                🔒 Сохраните эти данные в надежном месте
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 12px; color: #666666; font-size: 11px;">
                          Сотрудники onAI Academy никогда не запрашивают ваш пароль.
                        </td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
              </table>
              
              <!-- CTA BUTTON -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 35px 0 20px 0;">
                    <table border="0" cellspacing="0" cellpadding="0" style="background-color: #00FF94; border-radius: 8px;">
                      <tr>
                        <td align="center">
                          <a href="https://onai.academy/tripwire/login" style="display: block; padding: 18px 45px; color: #000000; font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; font-family: Arial, sans-serif;">
                            ВОЙТИ В ПЛАТФОРМУ
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- FOOTER -->
          <tr>
            <td style="padding: 30px; text-align: center; font-size: 12px; color: #555555; border-top: 1px solid #1F1F1F;">
              <p style="margin: 0 0 5px 0;">onAI Academy — Интегратор 3.0</p>
              <p style="margin: 0 0 10px 0;">&copy; 2025 Все права защищены.</p>
              <p style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #555555; opacity: 0.7;">
                Это автоматическое письмо. Пожалуйста, не отвечайте на него.
              </p>
            </td>
          </tr>
          
        </table>
        <!-- END MAIN CONTENT TABLE -->
        
      </td>
    </tr>
  </table>
  <!-- END WRAPPER TABLE -->
  
</body>
</html>`;
}























