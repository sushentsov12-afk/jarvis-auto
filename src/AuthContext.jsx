import { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.addScope('email');
provider.addScope('profile');
provider.setCustomParameters({ prompt: 'select_account' });

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Сначала пробуем подхватить результат redirect-входа.
    // Важно: await нужен чтобы onAuthStateChanged не сработал
    // раньше, чем Firebase обработает возврат с Google.
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('[Auth] Redirect result: user =', result.user.email);
        } else {
          console.log('[Auth] Redirect result: no user (обычный заход, не после redirect)');
        }
      })
      .catch((err) => {
        console.error('[Auth] Redirect result error:', err.code, err.message);
        setError(err.message);
      });

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log('[Auth] onAuthStateChanged:', u ? u.email : 'null');
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      setError(null);
      await signInWithRedirect(auth, provider);
      // Страница перезагрузится на Google и вернётся обратно —
      // результат подхватит getRedirectResult() выше.
    } catch (err) {
      setError(err.message);
    }
  };

  const logOut = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      signIn,
      signOut: logOut,
      displayName: user?.displayName,
      email: user?.email,
      photoURL: user?.photoURL,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

