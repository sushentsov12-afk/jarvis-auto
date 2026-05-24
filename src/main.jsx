import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './AuthContext.jsx';
import App from './App.jsx';

// Register Service Worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(
      (reg) => console.log('[SW] Registered:', reg.scope),
      (err) => console.error('[SW] Registration failed:', err)
    );
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
