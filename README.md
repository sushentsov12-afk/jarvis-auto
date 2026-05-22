# ⚙ JARVIS AUTO — v8

> **AI-платформа управления автомобилем** — диагностика OBD-II, сервисная книжка, кузовная карта, аналитика расходов и экстренная помощь.

![Version](https://img.shields.io/badge/version-8.0.0-FF6B00) ![Stack](https://img.shields.io/badge/stack-React%20%2B%20Firebase-blue) ![AI](https://img.shields.io/badge/AI-Claude%20Sonnet%204-8b5cf6) ![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Что умеет v8

| Модуль | Описание |
|--------|----------|
| **⚙ Диагностика** | Расшифровка кодов OBD-II и симптомов через Claude AI + офлайн-база 8 кодов |
| **📊 Аналитика** | Стоимость/км, расход топлива, тренды по месяцам, прогноз ТО |
| **🔔 Центр уведомлений** | Просроченные ТО, документы, давление шин, предстоящие записи |
| **🚗 Схема кузова** | Интерактивная SVG-карта 19 зон с метками повреждений и заметками |
| **≡ Сервисная книжка** | 8 операций ТО с авторасчётом износа по пробегу и времени, история замен |
| **₽ Финансы** | Учёт расходов по категориям, история заправок, расчёт среднего расхода |
| **📅 Записи в сервис** | Планирование визитов с датой, временем, телефоном и заметками |
| **🛞 Давление шин** | Мониторинг 4 колёс с цветовой индикацией, SVG-схема |
| **📄 Документы** | ОСАГО, КАСКО, техосмотр, права — с отсчётом дней до истечения |
| **📍 Геолокация** | Региональный КБМ для ОСАГО, поиск ближайших сервисов |
| **💡 Советы Джарвиса** | ИИ-чат на основе данных конкретного авто |
| **🆘 Экстренная помощь** | Пошаговые инструкции для ДТП, пробития, прикурки, перегрева |
| **+ Быстрый расход** | Bottom sheet для добавления трат в 2 тапа |

---

## 🗂 Структура репозитория

```
jarvis-auto/
├── src/
│   └── App.jsx              # Основной компонент (v8) — вся логика
├── public/
│   ├── index.html           # Standalone HTML-версия (без сборщика)
│   ├── manifest.json        # PWA-манифест
│   └── service-worker.js    # SW: кэш, push, background sync
├── functions/
│   └── src/
│       └── index.ts         # Firebase Cloud Functions (Claude API proxy)
├── docs/
│   ├── FIREBASE_SETUP.md    # Пошаговая настройка Firebase
│   └── ROADMAP.md           # Годовая дорожная карта продукта
├── package.json
├── .env.example
└── README.md
```

---

## 🚀 Быстрый старт

### Вариант 1 — Standalone HTML (нет сборщика, нет зависимостей)

```bash
# Откройте public/index.html в браузере
# Вставьте API-ключ в строке: 'x-api-key': 'ВАШ_КЛЮЧ'
# Готово.
```

> ⚠️ Не публикуйте HTML с ключом в открытый доступ — используйте Cloud Functions.

### Вариант 2 — React-приложение (рекомендуется для продакшна)

```bash
# 1. Клонировать и установить зависимости
git clone https://github.com/ВАШ_ЛОГИН/jarvis-auto.git
cd jarvis-auto
npm install

# 2. Создать .env из шаблона
cp .env.example .env
# Заполните VITE_FIREBASE_* и VITE_ANTHROPIC_KEY (только для dev)

# 3. Запустить
npm run dev
```

---

## 🔧 Технологии

| Категория | Инструмент |
|-----------|-----------|
| UI | React 18, inline styles (no CSS-in-JS) |
| Шрифт | IBM Plex Mono + IBM Plex Sans |
| Графики | Recharts (Area, Bar, Pie, Line) |
| AI | Anthropic Claude Sonnet 4 (`claude-sonnet-4-20250514`) |
| Хранение | localStorage (v8) → Firebase Firestore (следующий этап) |
| PWA | Web App Manifest + Service Worker |
| Геолокация | Nominatim (OpenStreetMap reverse geocoding) |
| Backend | Firebase Cloud Functions (TypeScript) |

---

## 🏗 Архитектура данных (localStorage → Firestore)

### Текущие ключи localStorage (v8)

| Ключ | Тип | Описание |
|------|-----|----------|
| `ja8_car` | Object | Марка, модель, год, пробег, VIN, номер |
| `ja8_services` | Array | Список операций ТО со статусами |
| `ja8_diagHistory` | Array | История диагнозов (до 30) |
| `ja8_expenses` | Array | Расходы по категориям |
| `ja8_fuel` | Array | Журнал заправок |
| `ja8_body` | Object | Состояние 19 зон кузова |
| `ja8_tires` | Object | Давление 4 колёс |
| `ja8_appts` | Array | Записи в сервис |
| `ja8_docs` | Array | Документы с датами истечения |
| `ja8_geo` | Object | Кэш геолокации (1 час) |
| `ja8_name` | String | Имя пользователя |
| `ja8_onboarded` | Boolean | Флаг онбординга |

### Целевая структура Firestore (см. `docs/FIREBASE_SETUP.md`)

```
users/{userId}/
  profile        → name, email, tier
  cars/{carId}   → make, model, year, mileage, vin, plate
  maintenance/{carId}/{serviceId}
  expenses/{expenseId}
  fuel_logs/{fuelId}
  diagnostics/{diagId}
  documents/{docId}
```

---

## 🤖 AI-интеграция

### Прямой вызов (dev / standalone)

```javascript
const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'   // только для dev!
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: query }]
  })
});
```

### Через Cloud Function (продакшн)

```javascript
// Вызов защищённой функции Firebase
const token = await auth.currentUser.getIdToken();
const res = await fetch(FUNCTIONS_URL + '/analyzeDiagnosis', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, carMake, carModel, carYear, carMileage })
});
```

### Используемые промпты

| Функция | Модель | max_tokens |
|---------|--------|-----------|
| Диагностика OBD | claude-sonnet-4-20250514 | 1000 |
| Советы Джарвиса (чат) | claude-sonnet-4-20250514 | 600 |
| Поиск сервисов (demo) | claude-sonnet-4-20250514 | 1000 |

---

## 📱 PWA

- `public/manifest.json` — иконки, шорткаты на Диагностику / Сервис / Финансы
- `public/service-worker.js` — стратегии кэширования:
  - Статика → Cache First
  - Google Fonts / CDN → Cache with network fallback
  - API (Firebase, Claude) → Network First с offline-ответом
  - Background Sync тег `sync-diagnostics`
  - Push-уведомления о ТО

---

## 🗺 Дорожная карта

```
v1   MVP — OBD-диагностика (HTML standalone)          ✅ сделано
v2   Улучшенный UX, примеры запросов                  ✅
v3   Сервисная книжка, пробег                         ✅
v4   Финансы, история заправок                        ✅
v6   Схема кузова, давление шин                       ✅
v7   Документы, записи в сервис, геолокация ОСАГО     ✅
v8   Аналитика, центр уведомлений, быстрый расход     ✅ текущая

v9   Firebase Auth + Firestore sync                   ⏳ след. этап
v10  OBD2 via BLE (ELM327)                            ⏳
v11  Vision AI — фото деталей под капотом             ⏳
v12  Карта сервисов (реальный Google Places)          ⏳
```

Подробный план: [`docs/ROADMAP.md`](docs/ROADMAP.md)

---

## 🔐 Безопасность

- Никогда не коммитьте `ANTHROPIC_API_KEY` в репозиторий
- Для продакшна используйте **только** Cloud Functions как прокси
- Firebase Rules: данные пользователя доступны только ему (`request.auth.uid == userId`)
- CORS в Cloud Functions ограничен вашим доменом через `ALLOWED_ORIGINS`

---

## 📄 Лицензия

MIT — свободное использование с указанием авторства.

---

<div align="center">
  <b>JARVIS AUTO v8</b> · Deep Blue + Safety Orange · AI Automotive Platform
</div>
