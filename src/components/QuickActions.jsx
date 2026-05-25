import React, { useState } from 'react';
import './QuickActions.css';

export default function QuickActions({ onActionClick }) {
  const [actions] = useState([
    {
      id: 'diagnose',
      title: '🔍 Диагностировать',
      description: 'Проверить ошибки OBD',
      icon: '🔍',
      color: '#2196f3',
    },
    {
      id: 'addcar',
      title: '🚗 Добавить авто',
      description: 'Новый автомобиль',
      icon: '🚗',
      color: '#4caf50',
    },
    {
      id: 'services',
      title: '🔧 Сервисы',
      description: 'Найти мастера',
      icon: '🔧',
      color: '#ff9800',
    },
    {
      id: 'history',
      title: '📋 История',
      description: 'Все диагностики',
      icon: '📋',
      color: '#9c27b0',
    },
  ]);

  return (
    <div className="quick-actions">
      <h3 className="quick-actions-title">⚡ Быстрые действия</h3>
      <div className="actions-grid">
        {actions.map(action => (
          <button
            key={action.id}
            className="action-btn"
            onClick={() => onActionClick?.(action.id)}
            style={{ borderTopColor: action.color }}
          >
            <div className="action-icon" style={{ background: `${action.color}22` }}>
              {action.icon}
            </div>
            <div className="action-content">
              <p className="action-title">{action.title}</p>
              <p className="action-desc">{action.description}</p>
            </div>
            <span className="action-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
