import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import './UserProfile.css';

export default function UserProfile({ user, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);
  const [stats, setStats] = useState({
    diagnoses: 12,
    cars: 2,
    services: 5,
  });

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onLogout?.();
      setShowMenu(false);
    } catch (err) {
      console.error('Ошибка при выходе:', err);
    }
  };

  return (
    <div className="user-profile">
      <div className="profile-trigger" onClick={() => setShowMenu(!showMenu)}>
        <div className="avatar">
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.displayName} />
          ) : (
            <span>👤</span>
          )}
        </div>
        <div className="profile-info">
          <p className="name">{user?.displayName || 'Пользователь'}</p>
          <p className="email">{user?.email}</p>
        </div>
        <span className="chevron">⋮</span>
      </div>

      {showMenu && (
        <div className="profile-menu">
          <div className="stats-section">
            <div className="stat">
              <span className="stat-value">{stats.diagnoses}</span>
              <span className="stat-label">Диагностик</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.cars}</span>
              <span className="stat-label">Авто</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.services}</span>
              <span className="stat-label">Сервисов</span>
            </div>
          </div>

          <div className="menu-divider"></div>

          <div className="menu-items">
            <button className="menu-item">
              <span>⚙️</span>
              <span>Настройки</span>
            </button>
            <button className="menu-item">
              <span>💬</span>
              <span>Обратная связь</span>
            </button>
            <button className="menu-item">
              <span>❓</span>
              <span>Справка</span>
            </button>
          </div>

          <div className="menu-divider"></div>

          <button className="logout-btn" onClick={handleLogout}>
            <span>🚪</span>
            <span>Выход</span>
          </button>
        </div>
      )}
    </div>
  );
}
