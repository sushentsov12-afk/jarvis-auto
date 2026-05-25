import React, { useState } from 'react';
import './DashboardStats.css';

export default function DashboardStats() {
  const [stats] = useState({
    totalDiagnoses: 24,
    avgIssueLevel: 'средний',
    carHealth: 78,
    totalSpent: 15420,
    nextService: '3 дня',
  });

  return (
    <div className="dashboard-stats">
      <div className="stat-card health">
        <div className="stat-header">
          <span className="stat-icon">❤️</span>
          <span className="stat-label">Здоровье авто</span>
        </div>
        <div className="stat-value">{stats.carHealth}%</div>
        <div className="stat-bar">
          <div className="stat-bar-fill" style={{ width: `${stats.carHealth}%` }}></div>
        </div>
      </div>

      <div className="stat-card diagnoses">
        <div className="stat-header">
          <span className="stat-icon">🔍</span>
          <span className="stat-label">Диагностик</span>
        </div>
        <div className="stat-value">{stats.totalDiagnoses}</div>
        <div className="stat-detail">всего проведено</div>
      </div>

      <div className="stat-card issues">
        <div className="stat-header">
          <span className="stat-icon">⚠️</span>
          <span className="stat-label">Средний уровень</span>
        </div>
        <div className="stat-value">{stats.avgIssueLevel}</div>
        <div className="stat-detail">проблем</div>
      </div>

      <div className="stat-card budget">
        <div className="stat-header">
          <span className="stat-icon">💰</span>
          <span className="stat-label">Расходы</span>
        </div>
        <div className="stat-value">{stats.totalSpent.toLocaleString('ru-RU')} ₽</div>
        <div className="stat-detail">в этом году</div>
      </div>

      <div className="stat-card service">
        <div className="stat-header">
          <span className="stat-icon">🔧</span>
          <span className="stat-label">Следующее ТО</span>
        </div>
        <div className="stat-value">{stats.nextService}</div>
        <div className="stat-detail">рекомендуется</div>
      </div>
    </div>
  );
}
