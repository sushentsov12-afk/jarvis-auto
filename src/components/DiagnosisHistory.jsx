import React from 'react';
import './DiagnosisHistory.css';

export default function DiagnosisHistory({ history, onSelectDiagnosis }) {
  if (!history || history.length === 0) {
    return (
      <div className="history-container">
        <h2>📋 История диагностик</h2>
        <p className="no-history">История пуста. Проведите первую диагностику.</p>
      </div>
    );
  }

  const getDangerColor = (danger) => {
    switch (danger) {
      case 'низкий':
        return 'green';
      case 'средний':
        return 'orange';
      case 'высокий':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getDangerIcon = (danger) => {
    switch (danger) {
      case 'низкий':
        return '✅';
      case 'средний':
        return '⚠️';
      case 'высокий':
        return '🚨';
      default:
        return '❓';
    }
  };

  return (
    <div className="history-container">
      <h2>📋 История диагностик</h2>
      <p className="history-count">Всего диагностик: {history.length}</p>

      <div className="history-list">
        {history.map((item, idx) => (
          <div
            key={idx}
            className={`history-item ${getDangerColor(item.danger)}`}
            onClick={() => onSelectDiagnosis?.(item)}
          >
            <div className="history-left">
              <span className="history-icon">{getDangerIcon(item.danger)}</span>
              <div className="history-info">
                <h4>{item.code}: {item.title}</h4>
                <p className="history-date">
                  {new Date(item.timestamp).toLocaleDateString('ru-RU')}
                </p>
              </div>
            </div>
            <div className="history-right">
              <span className="danger-badge">{item.danger}</span>
              <span className="arrow">→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
