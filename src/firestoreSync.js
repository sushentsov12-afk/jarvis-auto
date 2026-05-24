import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  enableIndexedDbPersistence,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let syncStatusCallback = null;
let debounceTimers = {};

export function onSyncStatusChange(callback) {
  syncStatusCallback = callback;
  return () => { syncStatusCallback = null; };
}

function notifyStatus(status) {
  if (syncStatusCallback) syncStatusCallback(status);
}

export async function enableOfflinePersistence() {
  try {
    await enableIndexedDbPersistence(db);
    console.log('[Firestore] Offline persistence enabled');
  } catch (err) {
    if (err.code === 'failed-precondition') {
      console.warn('[Firestore] Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firestore] Offline persistence not supported');
    }
  }
}

export async function loadUserData(uid, carId) {
  try {
    const userDocSnap = await getDoc(doc(db, 'users', uid));
    if (!userDocSnap.exists()) return null;

    const userDoc = userDocSnap.data();

    // Загружаем данные автомобиля
    const carSnap = await getDoc(doc(db, 'users', uid, 'cars', carId));
    const car = carSnap.exists() ? carSnap.data() : null;

    // Загружаем коллекции
    const [servicesSnap, expensesSnap, fuelSnap, diagSnap, bodySnap, tiresSnap, docsSnap, apptsSnap] = await Promise.all([
      getDocs(collection(db, 'users', uid, 'cars', carId, 'maintenance')),
      getDocs(collection(db, 'users', uid, 'cars', carId, 'expenses')),
      getDocs(collection(db, 'users', uid, 'cars', carId, 'fuel_logs')),
      getDocs(collection(db, 'users', uid, 'cars', carId, 'diagnostics')),
      getDoc(doc(db, 'users', uid, 'cars', carId, 'metadata', 'body')),
      getDoc(doc(db, 'users', uid, 'cars', carId, 'metadata', 'tires')),
      getDocs(collection(db, 'users', uid, 'cars', carId, 'documents')),
      getDocs(collection(db, 'users', uid, 'cars', carId, 'appointments')),
    ]);

    return {
      car,
      services: servicesSnap.docs.map(d => d.data()),
      expenses: expensesSnap.docs.map(d => d.data()),
      fuel: fuelSnap.docs.map(d => d.data()),
      diagHistory: diagSnap.docs.map(d => d.data()).slice(0, 30),
      body: bodySnap.exists() ? bodySnap.data() : null,
      tires: tiresSnap.exists() ? tiresSnap.data() : null,
      docs: docsSnap.docs.map(d => d.data()),
      appts: apptsSnap.docs.map(d => d.data()),
    };
  } catch (err) {
    console.error('[Sync] loadUserData error:', err);
    return null;
  }
}

export async function migrateFromLocalStorage(uid, carId, localData) {
  try {
    notifyStatus('syncing');

    // Создаём пользователя
    await setDoc(doc(db, 'users', uid), {
      migratedAt: new Date(),
      migratedFromLocalStorage: true,
    }, { merge: true });

    // Сохраняем данные автомобиля
    if (localData.car) {
      await setDoc(doc(db, 'users', uid, 'cars', carId), localData.car);
    }

    // Сохраняем коллекции
    if (localData.services?.length) {
      for (const s of localData.services) {
        await setDoc(doc(db, 'users', uid, 'cars', carId, 'maintenance', String(s.id)), s);
      }
    }

    if (localData.expenses?.length) {
      for (const e of localData.expenses) {
        await setDoc(doc(db, 'users', uid, 'cars', carId, 'expenses', String(e.id)), e);
      }
    }

    if (localData.fuel?.length) {
      for (const f of localData.fuel) {
        await setDoc(doc(db, 'users', uid, 'cars', carId, 'fuel_logs', String(f.id)), f);
      }
    }

    if (localData.body) {
      await setDoc(doc(db, 'users', uid, 'cars', carId, 'metadata', 'body'), localData.body);
    }

    if (localData.tires) {
      await setDoc(doc(db, 'users', uid, 'cars', carId, 'metadata', 'tires'), localData.tires);
    }

    if (localData.docs?.length) {
      for (const d of localData.docs) {
        await setDoc(doc(db, 'users', uid, 'cars', carId, 'documents', String(d.id)), d);
      }
    }

    if (localData.appts?.length) {
      for (const a of localData.appts) {
        await setDoc(doc(db, 'users', uid, 'cars', carId, 'appointments', String(a.id)), a);
      }
    }

    notifyStatus('synced');
    console.log('[Sync] Migration completed');
  } catch (err) {
    console.error('[Sync] Migration error:', err);
    notifyStatus('error');
    throw err;
  }
}

function debounce(fn, ms) {
  return (...args) => {
    clearTimeout(debounceTimers[fn.name]);
    debounceTimers[fn.name] = setTimeout(() => fn(...args), ms);
  };
}

const syncCar = debounce(async (uid, carId, car) => {
  if (!car) return;
  try {
    await setDoc(doc(db, 'users', uid, 'cars', carId), car);
    notifyStatus('synced');
  } catch (err) {
    console.error('[Sync] syncCar error:', err);
    notifyStatus('error');
  }
}, 1500);

const syncServices = debounce(async (uid, carId, services) => {
  if (!services?.length) return;
  try {
    for (const s of services) {
      await setDoc(doc(db, 'users', uid, 'cars', carId, 'maintenance', String(s.id)), s);
    }
    notifyStatus('synced');
  } catch (err) {
    console.error('[Sync] syncServices error:', err);
    notifyStatus('error');
  }
}, 1500);

const syncExpenses = debounce(async (uid, carId, expenses) => {
  if (!expenses?.length) return;
  try {
    for (const e of expenses) {
      await setDoc(doc(db, 'users', uid, 'cars', carId, 'expenses', String(e.id)), e);
    }
    notifyStatus('synced');
  } catch (err) {
    console.error('[Sync] syncExpenses error:', err);
    notifyStatus('error');
  }
}, 1500);

const syncFuel = debounce(async (uid, carId, fuel) => {
  if (!fuel?.length) return;
  try {
    for (const f of fuel) {
      await setDoc(doc(db, 'users', uid, 'cars', carId, 'fuel_logs', String(f.id)), f);
    }
    notifyStatus('synced');
  } catch (err) {
    console.error('[Sync] syncFuel error:', err);
    notifyStatus('error');
  }
}, 1500);

const syncDiagHistory = debounce(async (uid, carId, diagHistory) => {
  if (!diagHistory?.length) return;
  try {
    for (const d of diagHistory.slice(0, 30)) {
      await setDoc(doc(db, 'users', uid, 'cars', carId, 'diagnostics', String(d.id || Date.now())), d);
    }
    notifyStatus('synced');
  } catch (err) {
    console.error('[Sync] syncDiagHistory error:', err);
    notifyStatus('error');
  }
}, 2000);

const syncBody = debounce(async (uid, carId, body) => {
  if (!body) return;
  try {
    await setDoc(doc(db, 'users', uid, 'cars', carId, 'metadata', 'body'), body);
    notifyStatus('synced');
  } catch (err) {
    console.error('[Sync] syncBody error:', err);
    notifyStatus('error');
  }
}, 1500);

const syncTires = debounce(async (uid, carId, tires) => {
  if (!tires) return;
  try {
    await setDoc(doc(db, 'users', uid, 'cars', carId, 'metadata', 'tires'), tires);
    notifyStatus('synced');
  } catch (err) {
    console.error('[Sync] syncTires error:', err);
    notifyStatus('error');
  }
}, 1500);

const syncDocs = debounce(async (uid, carId, docs) => {
  if (!docs?.length) return;
  try {
    for (const d of docs) {
      await setDoc(doc(db, 'users', uid, 'cars', carId, 'documents', String(d.id)), d);
    }
    notifyStatus('synced');
  } catch (err) {
    console.error('[Sync] syncDocs error:', err);
    notifyStatus('error');
  }
}, 1500);

const syncAppts = debounce(async (uid, carId, appts) => {
  if (!appts?.length) return;
  try {
    for (const a of appts) {
      await setDoc(doc(db, 'users', uid, 'cars', carId, 'appointments', String(a.id)), a);
    }
    notifyStatus('synced');
  } catch (err) {
    console.error('[Sync] syncAppts error:', err);
    notifyStatus('error');
  }
}, 1500);

export { syncCar, syncServices, syncExpenses, syncFuel, syncDiagHistory, syncBody, syncTires, syncDocs, syncAppts };
