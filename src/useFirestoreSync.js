import { useState, useEffect, useRef } from "react";
import {
  loadUserData,
  migrateFromLocalStorage,
  syncCar, syncServices, syncExpenses, syncFuel,
  syncDiagHistory, syncBody, syncTires, syncDocs, syncAppts,
  enableOfflinePersistence, onSyncStatusChange,
} from "./firestoreSync.js";

const CAR_ID = "car1";

export function useFirestoreSync({
  uid,
  car, setCar,
  services, setServices,
  expenses, setExpenses,
  fuel, setFuel,
  diagHistory, setDiagHistory,
  body, setBody,
  tires, setTires,
  docs, setDocs,
  appts, setAppts,
}) {
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudError, setCloudError] = useState(null);
  const [syncStatus, setSyncStatus] = useState("idle");
  const initialized = useRef(false);

  useEffect(() => {
    enableOfflinePersistence();
    const unsub = onSyncStatusChange(setSyncStatus);
    return unsub;
  }, []);

  useEffect(() => {
    if (!uid || initialized.current) return;

    async function init() {
      setSyncStatus("syncing");
      try {
        const cloud = await loadUserData(uid, CAR_ID);

        if (cloud) {
          console.log("[Sync] Данные загружены из Firestore");
          if (cloud.car) setCar(cloud.car);
          if (cloud.services) setServices(cloud.services);
          if (cloud.expenses) setExpenses(cloud.expenses);
          if (cloud.fuel) setFuel(cloud.fuel);
          if (cloud.diagHistory) setDiagHistory(cloud.diagHistory);
          if (cloud.body) setBody(cloud.body);
          if (cloud.tires) setTires(cloud.tires);
          if (cloud.docs) setDocs(cloud.docs);
          if (cloud.appts) setAppts(cloud.appts);
        } else {
          console.log("[Sync] Первый вход — мигрируем данные в Firestore");
          await migrateFromLocalStorage(uid, CAR_ID, {
            car, services, expenses, fuel,
            diagHistory, body, tires,
            docs, appts,
          });
        }

        setSyncStatus("synced");
        setCloudReady(true);
        initialized.current = true;
      } catch (err) {
        console.error("[Sync] Ошибка инициализации:", err);
        setCloudError(err.message);
        setSyncStatus("error");
        setCloudReady(true);
        initialized.current = true;
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    if (!uid || !cloudReady) return;
    syncCar(uid, CAR_ID, car);
  }, [car, uid, cloudReady]);

  useEffect(() => {
    if (!uid || !cloudReady) return;
    syncServices(uid, CAR_ID, services);
  }, [services, uid, cloudReady]);

  useEffect(() => {
    if (!uid || !cloudReady) return;
    syncExpenses(uid, CAR_ID, expenses);
  }, [expenses, uid, cloudReady]);

  useEffect(() => {
    if (!uid || !cloudReady) return;
    syncFuel(uid, CAR_ID, fuel);
  }, [fuel, uid, cloudReady]);

  useEffect(() => {
    if (!uid || !cloudReady) return;
    syncDiagHistory(uid, CAR_ID, diagHistory);
  }, [diagHistory, uid, cloudReady]);

  useEffect(() => {
    if (!uid || !cloudReady) return;
    syncBody(uid, CAR_ID, body);
  }, [body, uid, cloudReady]);

  useEffect(() => {
    if (!uid || !cloudReady) return;
    syncTires(uid, CAR_ID, tires);
  }, [tires, uid, cloudReady]);

  useEffect(() => {
    if (!uid || !cloudReady) return;
    syncDocs(uid, CAR_ID, docs);
  }, [docs, uid, cloudReady]);

  useEffect(() => {
    if (!uid || !cloudReady) return;
    syncAppts(uid, CAR_ID, appts);
  }, [appts, uid, cloudReady]);

  return { cloudReady, cloudError, syncStatus };
}
