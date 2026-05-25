import React, { useState } from 'react';
import './NotificationCenter.css';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'warning',
      title: '⚠️ Требуется техническое обслуживание',
      message: 'Замена масла рекомендуется через 500 км',
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: 2,
      type: 'error',
      title: '🚨 Обнаружена ошибка P0171',
      message: 'Богатая смесь. Требуется диагностика',
      timestamp: new Date(Date.now() - 7200000),
    },
    {
      id: 3,
      type: 'info',
      title: 'ℹ️ Обновление данных',
      message: 'Синхронизация завершена успешно',
      timestamp: new Date(Date.now() - 86400000),
    },
  ]);

  const [isOpen, setIsOpen] = useState(false);

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'только что';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} мин назад`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч назад`;
    return `${Math.floor(seconds / 86400)} д назад`;
  };

  const removeNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error': return '🔴';
      case 'warning': return '🟡';
      case 'success': return '🟢';
      default: return '🔵';
    }
  };

  return (
    <div className="notification-center">
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
      >
        🔔
        {notifications.length > 0 && (
          <span className="notification-badge">{notifications.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>📬 Уведомления</h3>
            <button
              className="close-btn"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          {notifications.length > 0 ? (
            <div className="notification-list">
              {notifications.map(notif => (
                <div key={notif.id} className={`notification-item ${notif.type}`}>
                  <div className="notification-icon">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="notification-content">
                    <p className="notification-title">{notif.title}</p>
                    <p className="notification-message">{notif.message}</p>
                    <span className="notification-time">
                      {getTimeAgo(notif.timestamp)}
                    </span>
                  </div>
                  <button
                    className="remove-btn"
                    onClick={() => removeNotification(notif.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-notifications">
              <p>✨ Нет новых уведомлений</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
