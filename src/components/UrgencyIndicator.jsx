import React from 'react';
import './UrgencyIndicator.css';

export default function UrgencyIndicator({ danger, canDrive, urgency }) {
  const getDangerColor = (level) => {
    switch (level) {
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

  const getDangerIcon = (level) => {
    switch (level) {
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

  const getUrgencyText = (urgency) => {
    const map = {
      'сегодня': '⚡ Срочно сегодня!',
      '3 дня': '⏱️ В течение 3 дней',
      '1 неделя': '📅 В течение недели',
      '1 месяц': '📆 В течение месяца',
    };
    return map[urgency] || urgency;
  };

  return (
    <div className={`urgency-indicator ${getDangerColor(danger)}`}>
      <div className="urgency-row">
        <span className="urgency-icon">{getDangerIcon(danger)}</span>
        <div className="urgency-text">
          <strong>Опасность:</strong> {danger.toUpperCase()}
        </div>
      </div>

      <div className="urgency-row">
        <span className="drive-icon">{canDrive ? '🚗' : '🚫'}</span>
        <div className="urgency-text">
          <strong>Можно ли ездить:</strong> {canDrive ? 'ДА, но осторожно' : 'НЕТ, ехать опасно!'}
        </div>
      </div>

      <div className="urgency-row">
        <span className="time-icon">⏰</span>
        <div className="urgency-text">
          <strong>Срочность:</strong> {getUrgencyText(urgency)}
        </div>
      </div>
    </div>
  );
}
