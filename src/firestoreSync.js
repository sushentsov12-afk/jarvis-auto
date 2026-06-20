/**
 * firestoreSync.js — синхронизация данных пользователя с Firestore.
 *
 * Структура: users/{uid}/cars/{carId} — документ с полями car, services,
 * expenses, fuel, diagHistory, body, tires, docs, appts.
 */
import {
  doc, getDoc, setDoc, onSnapshot,
} from "firebase/firestore";
import {
  enableIndexedDbPersistence,
} from "firebase/firestore";
import { firestore } from "./firebaseConfig.js";

/* ── статус синхронизации (для SyncIndicator) ──────────────────────── */
let statusListeners = [];

function setStatus(status) {
  statusListeners.forEach((cb) => cb(status));
}

export function onSyncStatusChange(callback) {
  statusListeners.push(callback);
  return () => {
    statusListeners = statusListeners.filter((cb) => cb !== callback);
  };
}

/* ── оффлайн-кеш ─────────────────────────────────────────────────── */
let persistenceEnabled = false;

export function enableOfflinePersistence() {
  if (persistenceEnabled || !firestore) return;
  persistenceEnabled = true;
  enableIndexedDbPersistence(firestore).catch((err) => {
    console.warn("[Firestore] Offline persistence недоступен:", err.code);
  });
}

/* ── helpers ─────────────────────────────────────────────────────── */
function carDocRef(uid, carId) {
  return doc(firestore, "users", uid, "cars", carId);
}

async function syncField(uid, carId, field, value) {
  if (!firestore || !uid || !carId) return;
  try {
    setStatus("syncing");
    await setDoc(carDocRef(uid, carId), { [field]: value }, { merge: true });
    setStatus("synced");
  } catch (err) {
    console.error(`[Firestore] Ошибка синхронизации поля "${field}":`, err);
    setStatus("error");
  }
}

/* ── загрузка данных пользователя ───────────────────────────────── */
export async function loadUserData(uid, carId) {
  if (!firestore || !uid || !carId) return null;
  try {
    const snap = await getDoc(carDocRef(uid, carId));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("[Firestore] Ошибка загрузки данных:", err);
    throw err;
  }
}

/* ── миграция данных из localStorage при первом входе ─────────────── */
export async function migrateFromLocalStorage(uid, carId, data) {
  if (!firestore || !uid || !carId) return;
  try {
    setStatus("syncing");
    await setDoc(carDocRef(uid, carId), data, { merge: true });
    setStatus("synced");
  } catch (err) {
    console.error("[Firestore] Ошибка миграции данных:", err);
    setStatus("error");
    throw err;
  }
}

/* ── синхронизация отдельных полей ─────────────────────────────────── */
export const syncCar = (uid, carId, value) => syncField(uid, carId, "car", value);
export const syncServices = (uid, carId, value) => syncField(uid, carId, "services", value);
export const syncExpenses = (uid, carId, value) => syncField(uid, carId, "expenses", value);
export const syncFuel = (uid, carId, value) => syncField(uid, carId, "fuel", value);
export const syncDiagHistory = (uid, carId, value) => syncField(uid, carId, "diagHistory", value);
export const syncBody = (uid, carId, value) => syncField(uid, carId, "body", value);
export const syncTires = (uid, carId, value) => syncField(uid, carId, "tires", value);
export const syncDocs = (uid, carId, value) => syncField(uid, carId, "docs", value);
export const syncAppts = (uid, carId, value) => syncField(uid, carId, "appts", value);

/* ── синхронизация всего документа сразу (используется по необходимости) ── */
export async function syncCarFull(uid, carId, data) {
  if (!firestore || !uid || !carId) return;
  try {
    setStatus("syncing");
    await setDoc(carDocRef(uid, carId), data, { merge: true });
    setStatus("synced");
  } catch (err) {
    console.error("[Firestore] Ошибка полной синхронизации:", err);
    setStatus("error");
  }
}

/* ── живая подписка на изменения (опционально, для будущего realtime) ── */
export function subscribeToCarData(uid, carId, callback) {
  if (!firestore || !uid || !carId) return () => {};
  return onSnapshot(carDocRef(uid, carId), (snap) => {
    if (snap.exists()) callback(snap.data());
  });
}
