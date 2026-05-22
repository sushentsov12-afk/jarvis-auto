# Firebase Setup Guide для Jarvis Auto

## 1. Инициализация Firebase проекта

### Шаг 1: Создание проекта в Firebase Console
```bash
# Перейди на https://console.firebase.google.com
# Нажми "Create Project"
# Название: jarvis-auto-prod
# Отключи Google Analytics (для MVP)
```

### Шаг 2: Добавление веб-приложения
```
В Project Settings:
1. Перейди на вкладку "Your apps"
2. Нажми иконку </> (Web)
3. Название: Jarvis Auto Web
4. Скопируй конфиг (понадобится в шаге 5)
```

---

## 2. Структура Firestore Database

### Collections и документы:

```
firestore/
├── users/
│   └── {userId}/
│       ├── profile (document)
│       │   ├── name: string
│       │   ├── email: string
│       │   ├── createdAt: timestamp
│       │   └── tier: "free" | "pro"
│       │
│       ├── cars/ (collection)
│       │   └── {carId}/ (document)
│       │       ├── make: string
│       │       ├── model: string
│       │       ├── year: number
│       │       ├── mileage: number
│       │       ├── color: string
│       │       ├── fuel: string
│       │       ├── vin: string
│       │       └── createdAt: timestamp
│       │
│       ├── maintenance/ (collection)
│       │   └── {carId}/ (collection)
│       │       └── {serviceId}/ (document)
│       │           ├── name: string
│       │           ├── icon: string
│       │           ├── lastKm: number
│       │           ├── lastDate: string
│       │           ├── intervalKm: number
│       │           ├── intervalMo: number
│       │           ├── status: "ok" | "warning" | "overdue"
│       │           └── updatedAt: timestamp
│       │
│       ├── expenses/ (collection)
│       │   └── {expenseId}/ (document)
│       │       ├── date: string
│       │       ├── category: string
│       │       ├── amount: number
│       │       ├── note: string
│       │       ├── carId: string (optional - для авто)
│       │       └── createdAt: timestamp
│       │
│       ├── fuel_logs/ (collection)
│       │   └── {fuelId}/ (document)
│       │       ├── date: string
│       │       ├── liters: number
│       │       ├── cost: number
│       │       ├── odometer: number
│       │       ├── station: string
│       │       ├── carId: string
│       │       └── createdAt: timestamp
│       │
│       ├── diagnostics/ (collection)
│       │   └── {diagId}/ (document)
│       │       ├── query: string
│       │       ├── title: string
│       │       ├── danger: "низкий" | "средний" | "высокий"
│       │       ├── canDrive: boolean
│       │       ├── carId: string
│       │       └── createdAt: timestamp
│       │
│       └── documents/ (collection)
│           └── {docId}/ (document)
│               ├── name: string
│               ├── icon: string
│               ├── expires: string
│               ├── note: string
│               └── createdAt: timestamp
│
└── obd_codes/ (shared - читаемая база кодов)
    └── {code}/ (document)
        ├── title: string
        ├── system: string
        ├── description: string
        ├── danger: "низкий" | "средний" | "высокий"
        └── ...
```

---

## 3. Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Пользователь может читать/писать только свои данные
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Общие OBD коды (все читают)
    match /obd_codes/{document=**} {
      allow read: if true;
      allow write: if false; // Только админ через Cloud Functions
    }
  }
}
```

---

## 4. Authentication настройка

### Включить Google Sign-In:
```
Firebase Console > Authentication > Sign-in method:
1. Google - Enable
2. Добавить свой OAuth 2.0 client ID (если нужна кастомизация)
```

### Включить Phone Auth (опционально):
```
Firebase Console > Authentication > Sign-in method:
1. Phone - Enable
2. Добавить reCAPTCHA token (защита от ботов)
```

---

## 5. Реализация в коде (utils/firebase.ts)

```typescript
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/* ── AUTHENTICATION ──────────────────────────────────────────────── */

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}

export async function logOut() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/* ── USER PROFILE ────────────────────────────────────────────────── */

export async function initializeUserProfile(uid: string, name: string) {
  const userRef = doc(db, 'users', uid, 'profile', 'data');
  await setDoc(userRef, {
    name,
    email: auth.currentUser?.email || '',
    createdAt: Timestamp.now(),
    tier: 'free',
  });
}

export async function getUserProfile(uid: string) {
  const userRef = doc(db, 'users', uid, 'profile', 'data');
  const snap = await getDoc(userRef);
  return snap.data();
}

/* ── CARS ────────────────────────────────────────────────────────── */

export async function addCar(uid: string, carData: any) {
  const carRef = doc(collection(db, 'users', uid, 'cars'));
  await setDoc(carRef, {
    ...carData,
    createdAt: Timestamp.now(),
  });
  return carRef.id;
}

export async function getCars(uid: string) {
  const carsRef = collection(db, 'users', uid, 'cars');
  const snap = await getDocs(carsRef);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updateCar(uid: string, carId: string, carData: any) {
  const carRef = doc(db, 'users', uid, 'cars', carId);
  await updateDoc(carRef, carData);
}

/* ── MAINTENANCE ────────────────────────────────────────────────── */

export async function addMaintenanceRecord(uid: string, carId: string, record: any) {
  const recordRef = doc(collection(db, 'users', uid, 'maintenance', carId, 'services'));
  await setDoc(recordRef, {
    ...record,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return recordRef.id;
}

export async function getMaintenanceRecords(uid: string, carId: string) {
  const recordsRef = collection(db, 'users', uid, 'maintenance', carId, 'services');
  const snap = await getDocs(recordsRef);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updateMaintenanceRecord(
  uid: string,
  carId: string,
  recordId: string,
  data: any
) {
  const recordRef = doc(db, 'users', uid, 'maintenance', carId, 'services', recordId);
  await updateDoc(recordRef, { ...data, updatedAt: Timestamp.now() });
}

/* ── EXPENSES ────────────────────────────────────────────────────── */

export async function addExpense(uid: string, expense: any) {
  const expenseRef = doc(collection(db, 'users', uid, 'expenses'));
  await setDoc(expenseRef, {
    ...expense,
    createdAt: Timestamp.now(),
  });
  return expenseRef.id;
}

export async function getExpenses(uid: string, carId?: string) {
  const expensesRef = collection(db, 'users', uid, 'expenses');
  let q = expensesRef;
  
  if (carId) {
    q = query(expensesRef, where('carId', '==', carId));
  }
  
  const snap = await getDocs(q);
  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/* ── FUEL LOGS ───────────────────────────────────────────────────── */

export async function addFuelLog(uid: string, log: any) {
  const logRef = doc(collection(db, 'users', uid, 'fuel_logs'));
  await setDoc(logRef, {
    ...log,
    createdAt: Timestamp.now(),
  });
  return logRef.id;
}

export async function getFuelLogs(uid: string, carId: string) {
  const logsRef = collection(db, 'users', uid, 'fuel_logs');
  const q = query(logsRef, where('carId', '==', carId));
  const snap = await getDocs(q);
  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/* ── DIAGNOSTICS ────────────────────────────────────────────────── */

export async function saveDiagnosis(uid: string, diagnosis: any) {
  const diagRef = doc(collection(db, 'users', uid, 'diagnostics'));
  await setDoc(diagRef, {
    ...diagnosis,
    createdAt: Timestamp.now(),
  });
  return diagRef.id;
}

export async function getDiagnostics(uid: string) {
  const diagRef = collection(db, 'users', uid, 'diagnostics');
  const snap = await getDocs(diagRef);
  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);
}

/* ── DOCUMENTS (страховка, техосмотр и т.д.) ────────────────────── */

export async function addDocument(uid: string, doc: any) {
  const docRef = doc(collection(db, 'users', uid, 'documents'));
  await setDoc(docRef, {
    ...doc,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getDocuments(uid: string) {
  const docsRef = collection(db, 'users', uid, 'documents');
  const snap = await getDocs(docsRef);
  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => new Date(a.expires).getTime() - new Date(b.expires).getTime());
}
```

---

## 6. Environment Variables (.env.local)

```bash
REACT_APP_FIREBASE_API_KEY=AIzaSyD...
REACT_APP_FIREBASE_AUTH_DOMAIN=jarvis-auto-prod.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=jarvis-auto-prod
REACT_APP_FIREBASE_STORAGE_BUCKET=jarvis-auto-prod.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef...

# Cloud Functions URL
REACT_APP_CLAUDE_FUNCTION_URL=https://us-central1-jarvis-auto-prod.cloudfunctions.net/analyzeDiagnosis
```

---

## 7. Миграция с localStorage

### Когда пользователь логинится первый раз:

```typescript
async function migrateLocalStorageToFirestore(uid: string) {
  // Получи данные из localStorage
  const cars = JSON.parse(localStorage.getItem('ja4_car') || '{}');
  const services = JSON.parse(localStorage.getItem('ja4_services') || '[]');
  const expenses = JSON.parse(localStorage.getItem('ja4_expenses') || '[]');
  const fuel = JSON.parse(localStorage.getItem('ja4_fuel') || '[]');

  // Загрузи в Firestore
  if (cars.make) {
    const carId = await addCar(uid, cars);
    
    for (const service of services) {
      await addMaintenanceRecord(uid, carId, service);
    }
    
    for (const exp of expenses) {
      await addExpense(uid, { ...exp, carId });
    }
    
    for (const f of fuel) {
      await addFuelLog(uid, { ...f, carId });
    }
  }

  // Удали локальные данные
  ['car', 'services', 'expenses', 'fuel'].forEach(k => 
    localStorage.removeItem('ja4_' + k)
  );
}
```

---

## 8. Оффлайн поддержка (enableIndexedDbPersistence)

```typescript
import { enableIndexedDbPersistence } from 'firebase/firestore';

try {
  await enableIndexedDbPersistence(db);
  console.log('Offline persistence enabled');
} catch (err: any) {
  if (err.code === 'failed-precondition') {
    console.log('Multiple tabs open, persistence disabled');
  } else if (err.code === 'unimplemented') {
    console.log('Browser doesn\'t support persistence');
  }
}
```

При отсутствии интернета Firestore автоматически синхронизирует данные локально и загружает их при восстановлении соединения.

---

## 9. Real-time listener (синхронизация между вкладками)

```typescript
import { onSnapshot } from 'firebase/firestore';

export function watchCars(uid: string, callback: (cars: any[]) => void) {
  const carsRef = collection(db, 'users', uid, 'cars');
  
  return onSnapshot(carsRef, (snap) => {
    const cars = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(cars);
  });
}

// Использование:
useEffect(() => {
  const unsubscribe = watchCars(uid, (cars) => {
    setCars(cars); // Автоматически обновляется при изменении в Firestore
  });
  
  return unsubscribe;
}, [uid]);
```

---

## 10. Backup & Export

### Экспорт данных пользователем:

```typescript
export async function exportUserData(uid: string) {
  const profile = await getUserProfile(uid);
  const cars = await getCars(uid);
  const expenses = await getExpenses(uid);
  const diagnostics = await getDiagnostics(uid);

  const data = {
    exportedAt: new Date().toISOString(),
    profile,
    cars,
    expenses,
    diagnostics,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jarvis-auto-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Автоматический backup (Cloud Firestore Export):
```
Firebase Console > Firestore Database > Backups (в меню)
Настроить ежемесячные автоматические резервные копии
```

---

## 11. Затраты и пределы

| Операция | Free tier | Цена |
|----------|-----------|------|
| Чтение документа | 50K/день | $0.06 за 100K |
| Запись документа | 20K/день | $0.18 за 100K |
| Удаление | 20K/день | $0.02 за 100K |
| Authentication | 100 пользователей | $0 за первые 100K |

**MVP бюджет (1000 активных пользователей):** ~$20-50/месяц

---

## Быстрый чек-лист:

- [ ] Создан Firebase проект
- [ ] Включена Google Authentication
- [ ] Firestore Database инициализирована
- [ ] Security Rules установлены
- [ ] firebase.ts интегрирован в приложение
- [ ] .env.local заполнен
- [ ] Offline persistence включена
- [ ] Migration скрипт готов
- [ ] Real-time listeners работают
- [ ] Export функция готова
