import React, { useState } from 'react';
import GoogleAuthButton from './GoogleAuthButton';
import './AuthPanel.css';

export default function AuthPanel({ isOpen, onClose, onAuthSuccess }) {
  const [error, setError] = useState(null);

  const handleGoogleSuccess = (user) => {
    console.log('✅ Пользователь авторизован:', user.email);
    onAuthSuccess?.(user);
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal" onClick={onClose}>
      <div className="auth-content" onClick={(e) => e.stopPropagation()}>
        <div className="auth-header">
          <button className="auth-close" onClick={onClose}>×</button>
          <h2>🤖 Jarvis Auto</h2>
          <p>Честный советник механика</p>
        </div>

        <div className="auth-body">
          <h3 style={{ marginTop: 0, marginBottom: 16, color: '#333', fontSize: 16 }}>
            Добро пожаловать!
          </h3>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
            Авторизуйтесь, чтобы:
          </p>

          <ul style={{
            color: '#333',
            fontSize: 13,
            marginBottom: 24,
            paddingLeft: 20,
            lineHeight: 1.8,
          }}>
            <li>📊 Сохранять историю диагностик</li>
            <li>🚗 Управлять несколькими автомобилями</li>
            <li>💾 Синхронизировать данные в облаке</li>
            <li>🔐 Получить доступ ко всем функциям</li>
          </ul>

          {error && <div className="auth-error">⚠️ {error}</div>}

          <GoogleAuthButton onSuccess={handleGoogleSuccess} />

          <div className="auth-note">
            💡 Мы никогда не опубликуем ничего без вашего разрешения. Ваши данные защищены.
          </div>
        </div>
      </div>
    </div>
  );
}
