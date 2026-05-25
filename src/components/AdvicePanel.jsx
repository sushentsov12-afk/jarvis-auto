import React from 'react';
import './AdvicePanel.css';

export default function AdvicePanel({ diagnosis, code }) {
  if (!diagnosis) return null;

  return (
    <div className="advice-panel">
      <div className="advice-section">
        <h4>💬 Что это означает?</h4>
        <p className="advice-text">{diagnosis.description}</p>
      </div>

      <div className="advice-section">
        <h4>💰 Стоимость ремонта</h4>
        <div className="price-range">
          <span className="price-min">От {diagnosis.priceMin?.toLocaleString('ru-RU')} ₽</span>
          <span className="price-max">До {diagnosis.priceMax?.toLocaleString('ru-RU')} ₽</span>
        </div>
        <p className="price-note">⚠️ Это ориентировочно. Точная цена зависит от вашего авто и мастера.</p>
      </div>

      <div className="advice-section">
        <h4>🔧 Рекомендуемые действия</h4>
        <ul className="actions-list">
          {diagnosis.actions?.map((action, idx) => (
            <li key={idx}>
              <span className="action-number">{idx + 1}</span>
              <span className="action-text">{action}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="advice-section">
        <h4>🛠️ Детали для замены</h4>
        {diagnosis.parts?.length > 0 ? (
          <div className="parts-list">
            {diagnosis.parts.map((part, idx) => (
              <div key={idx} className="part-item">
                <span className="part-icon">•</span>
                <span className="part-name">{part}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-parts">Замену деталей не требуется</p>
        )}
      </div>

      <div className="advice-system">
        <span className="system-badge">Система: {diagnosis.system}</span>
      </div>
    </div>
  );
}
