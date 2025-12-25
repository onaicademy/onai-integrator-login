# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - button "РУС" [ref=e5] [cursor=pointer]:
      - img [ref=e6]
      - generic [ref=e9]: РУС
    - generic [ref=e10]:
      - generic [ref=e12]:
        - generic [ref=e13]:
          - img [ref=e14]
          - generic [ref=e22]:
            - heading "Командная Панель Трафика" [level=1] [ref=e23]
            - paragraph [ref=e26]: Вход в систему
        - generic [ref=e28]:
          - img [ref=e29]
          - paragraph [ref=e31]: Invalid credentials
        - generic [ref=e32]:
          - generic [ref=e33]:
            - generic [ref=e34]: Email
            - textbox "your@email.com" [ref=e35]: test@example.com
          - generic [ref=e36]:
            - generic [ref=e37]: Пароль
            - textbox "••••••••" [ref=e38]: password123
          - button "Войти →" [ref=e39] [cursor=pointer]:
            - generic [ref=e40]:
              - text: Войти
              - generic [ref=e41]: →
      - generic [ref=e42]:
        - paragraph [ref=e43]: OnAI Academy Traffic Dashboard
        - paragraph [ref=e46]: "2025"
      - paragraph [ref=e49]: ⚠️ IP-адреса отслеживаются. Передача доступа запрещена. Конфиденциальная информация.
```