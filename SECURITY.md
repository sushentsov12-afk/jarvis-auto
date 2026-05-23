# 🔒 Политика безопасности Jarvis Auto

## 🚨 Отчёт об уязвимостях

Если вы обнаружили уязвимость в безопасности, **пожалуйста, НЕ создавайте публичный Issue**.

Вместо этого отправьте приватное сообщение на GitHub профиль @sushentsov12-afk с описанием:
- Описание уязвимости
- Шаги для воспроизведения (если возможно)
- Потенциальные последствия
- Предложенное исправление (если есть)

## 📋 Текущие требования безопасности

### 1. API Ключи и учётные данные

❌ **НИКОГДА**:
- Не коммитьте `.env` файл с реальными ключами
- Не используйте API ключи Anthropic в фронтенд коде
- Не раскрывайте Firebase токены в браузере
- Не передавайте чувствительные ключи через фронтенд

✅ **ВСЕГДА**:
- Используйте Firebase Authentication для контроля доступа
- Вызывайте Anthropic API через Cloud Functions (переходной слой)
- Проверяйте окружение перед выполнением чувствительных операций
- Храните ANTHROPIC_API_KEY только в Cloud Functions

### 2. Cloud Functions Security

**Аутентификация и авторизация:**
- ✅ Все запросы должны быть аутентифицированы через Firebase Auth
- ✅ Проверяйте `request.headers.authorization` перед любыми операциями
- ✅ Валидируйте токен через `admin.auth().verifyIdToken(token)`

**Валидация входных данных:**
- ✅ Проверяйте тип данных (`typeof`)
- ✅ Ограничивайте длину строк (query: max 5000 символов)
- ✅ Валидируйте диапазоны (carYear: 1900-2100, carMileage: 0-10M)
- ✅ Используйте TypeScript interfaces для type-safety

**Rate Limiting:**
- ✅ 10 запросов в час на пользователя (защита от DDoS и переборов)
- ✅ Храните лимиты в Firestore для отслеживания на уровне БД
- ✅ Возвращайте `429 Too Many Requests` при превышении

**CORS и Security Headers:**
- ✅ Используйте whitelist разрешённых origin'ов
- ✅ Парсите ALLOWED_ORIGINS из переменных окружения
- ✅ Установите headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=31536000`
  - `Content-Security-Policy: default-src 'self'`

**Обработка ошибок:**
- ✅ Не раскрывайте внутренние ошибки клиенту
- ✅ Логируйте полные ошибки только на сервере
- ✅ Возвращайте generic сообщения пользователю

**Таймауты:**
- ✅ Установите максимальное время выполнения запросов (25 сек для Claude API)
- ✅ Используйте `Promise.race()` для контроля таймаутов

### 3. Firestore Security Rules

Пример безопасного правила:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Пользователь может читать/писать только свои данные
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      
      match /{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }
    
    // Rate limits - только внутрен��ие Cloud Functions (not accessible from client)
    match /rate_limits/{userId} {
      allow read, write: if false;
    }
    
    // Audit logs - только внутренние Cloud Functions
    match /audit_logs/{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 4. Frontend Security (index.html)

**Content Security Policy (установлено в `<meta>` теге):**
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'wasm-unsafe-eval'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               font-src 'self'; 
               connect-src 'self' https://identitytoolkit.googleapis.com https://us-central1-jarvis-auto-prod.cloudfunctions.net; 
               frame-ancestors 'none'; 
               object-src 'none'">
```

**Что защищает:**
- ✅ Разрешены скрипты только с того же источника
- ✅ Запрещены внешние фреймы
- ✅ Ограничены внешние подключения (только Firebase + Cloud Functions)
- ✅ Защита от XSS атак

### 5. Хранение данных в браузере

❌ **ОПАСНО**:
```javascript
// Не делайте так!
localStorage.setItem('token', firebaseToken);  // Уязвимо к XSS
localStorage.setItem('apiKey', anthropicKey);   // КРИТИЧНО!
```

✅ **БЕЗОПАСНО**:
```javascript
// Используйте Firebase SDK - он управляет токеном безопасно
import { getAuth } from 'firebase/auth';
const auth = getAuth();
// Firebase автоматически хранит и обновляет токен в защищённом хранилище

// Для локального хранения используйте localStorage ТОЛЬКО для:
// - Некритичные настройки (тема, язык)
// - Публичные данные
const DEF_CAR = { make: 'Toyota', model: 'Camry' };
localStorage.setItem('ja8_car', JSON.stringify(DEF_CAR));
```

### 6. Логирование и мониторинг

**Логируется:**
- ✅ Попытки аутентификации (успешные и неудачные)
- ✅ Вызовы API с параметрами (длина query, a не сам текст)
- ✅ Удаления аккаунтов
- ✅ Ошибки системы

**НЕ логируется:**
- ❌ Пароли или токены
- ❌ Полные тексты диагностики (только длина)
- ❌ Личная информация об авто
- ❌ Чувствительные параметры запросов

**Пример безопасного логирования:**
```typescript
await admin.firestore().collection('audit_logs').add({
  uid,
  action: 'diagnosis',
  query_length: body.query.length,  // ✅ Логируем длину
  // query: body.query,              // ❌ НЕ логируем полный текст!
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
});
```

### 7. Обновления зависимостей

Регулярно проверяйте обновления:

```bash
# Проверить уязвимости
npm audit

# Автоматически исправить
npm audit fix

# Обновить зависимости
npm update

# Проверить несовместимые версии
npm outdated
```

### 8. Развёртывание в продакшене

Перед деплоем убедитесь:

1. ✅ `.env` файл не содержит реальные ключи
2. ✅ `VITE_DIRECT_API=false` (используются Cloud Functions)
3. ✅ Переменные окружения в Firebase установлены:
   ```bash
   firebase functions:config:set anthropic.api_key="sk-ant-..."
   firebase functions:config:set allowed_origins="https://yourdomain.com"
   ```
4. ✅ Firestore Security Rules установлены правильно
5. ✅ ALLOWED_ORIGINS содержит только доверенные домены
6. ✅ HTTPS включён (обязателен)
7. ✅ Все чувствительные операции проходят через Cloud Functions

```bash
# 1. Установить переменные окружения
firebase functions:config:set anthropic.api_key="sk-ant-..." allowed_origins="https://jarvis-auto.example.com"

# 2. Deploy functions
firebase deploy --only functions

# 3. Deploy hosting
firebase deploy --only hosting

# 4. Проверить логи
firebase functions:log
```

### 9. Миграция с локальной разработки

**Развитие локально (dev):**
```env
VITE_DIRECT_API=true  # Используем локальный Anthropic API ключ
VITE_ANTHROPIC_KEY=sk-ant-...
VITE_FUNCTIONS_URL=http://localhost:5001/jarvis-auto-prod/us-central1
```

**Продакшен (production):**
```env
VITE_DIRECT_API=false  # Используем только Cloud Functions
VITE_ANTHROPIC_KEY=  # ОСТАВИТЬ ПУСТО!
VITE_FUNCTIONS_URL=https://us-central1-jarvis-auto-prod.cloudfunctions.net
```

### 10. Чеклист для кода

Перед коммитом убедитесь:

- [ ] Нет `VITE_ANTHROPIC_KEY` или других API ключей в коде
- [ ] Все вызовы чувствительных API проходят через Cloud Functions
- [ ] Входные данные валидируются (тип, длина, диапазон)
- [ ] Ошибки обработаны без раскрытия деталей
- [ ] Rate limiting реализовано
- [ ] Логирование не содержит чувствительных данных
- [ ] CORS настроен с whitelist'ом
- [ ] Security Headers установлены
- [ ] Используется HTTPS в продакшене
- [ ] Firestore Rules ограничивают доступ

## 📚 Дополнительные ресурсы

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Rules Best Practices](https://firebase.google.com/docs/rules/best-practices)
- [Cloud Functions Security](https://cloud.google.com/functions/docs/securing)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

## 📝 История обновлений

- **2026-05-23** (v8.0.0): Исправлены критические уязвимости в API и фронтенде
  - CORS Validation
  - Input Validation улучшения
  - Security Headers
  - Logging безопасность
  - Rate Limiting

---

**Обновлено**: 2026-05-23 | **Версия**: 8.0.0
