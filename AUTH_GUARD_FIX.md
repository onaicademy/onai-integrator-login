# ✅ ИСПРАВЛЕНО: Auth Guard для Debug Panel

## ❌ Проблема:
- TripwireAdminGuard проверял `tripwire_users` table
- SystemHealth и DebugPanel используют Main Platform auth
- Конфликт → редирект на логин

## ✅ Решение:
```typescript
// БЫЛО:
<TripwireAdminGuard>
  <TripwireLayout>
    <SystemHealth />
  </TripwireLayout>
</TripwireAdminGuard>

// СТАЛО:
<SalesGuard>
  <SystemHealth />
</SalesGuard>
```

**SalesGuard** проверяет Tripwire auth и пускает `admin` или `sales` роли.

---

## 🚀 Деплой:
- ✅ Build: Done
- ✅ Deploy: `/var/www/onai.academy/`
- ✅ Nginx: Reloaded
- ✅ Commit: `667126f`

---

## 🧪 Проверь:
1. Обнови страницу: **Cmd+Shift+R**
2. Зайди: https://onai.academy/integrator/admin/system-health
3. Зайди: https://onai.academy/integrator/admin/debug

**Должны открыться без редиректа! ✅**
