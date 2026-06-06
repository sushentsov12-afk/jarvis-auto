import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

export const missingEnv = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

let app = null;
let auth = null;
let firestore = null;

try {
  if (missingEnv.length === 0) {
    app = getApps().length
      ? getApps()[0]
      : initializeApp(firebaseConfig);

    auth = getAuth(app);
    firestore = getFirestore(app);
  } else {
    console.error("Firebase ENV missing:", missingEnv);
  }
} catch (error) {
  console.error("Firebase init error:", error);
}

export { auth, firestore };
export default app;
