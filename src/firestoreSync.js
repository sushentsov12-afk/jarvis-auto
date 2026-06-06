import { useEffect, useRef } from "react";
import { syncCarFull } from "./firestoreSync";

export default function useFirestoreSync(uid, carId, data) {
  const lastDataRef = useRef(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (!uid || !carId || !data) return;

    const same =
      JSON.stringify(lastDataRef.current) === JSON.stringify(data);

    if (same && initRef.current) return;

    lastDataRef.current = data;
    initRef.current = true;

    syncCarFull(uid, carId, data);
  }, [uid, carId, data]);
}
