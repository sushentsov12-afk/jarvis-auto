import React, { useState } from 'react';
import { lookupOBD } from '../obdDatabase';
import UrgencyIndicator from './UrgencyIndicator';
import AdvicePanel from './AdvicePanel';
import './DiagnosisComponent.css';

export default function DiagnosisComponent({ onDiagnose }) {
  const [obdCode, setObdCode] = useState('');
  const [diagnosis, setDiagnosis] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDiagnose = async () => {
    if (!obdCode.trim()) {
      setError('Введите OBD код (например: P0171)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = lookupOBD(obdCode);
      if (result) {
        setDiagnosis(result);
        onDiagnose?.(result);
      } else {
        setError('Код не найден в базе. Проверьте правильность ввода.');
      }
    } catch (err) {
      setError('Ошибка при поиске кода');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleDiagnose();
  };

  return (
    <div className="diagnosis-container">
      <div className="diagnosis-card">
        <h2>🔍 Диагностика ошибки</h2>
        <p className="subtitle">Введите OBD код ошибки из сканера</p>

        <div className="input-group">
          <input
            type="text"
            placeholder="Например: P0171, P0420, P0300"
            value={obdCode}
            onChange={(e) => setObdCode(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            className="obd-input"
            maxLength="8"
          />
          <button
            onClick={handleDiagnose}
            disabled={loading}
            className="diagnose-btn"
          >
            {loading ? '⏳ Ищу...' : '🔎 Диагностировать'}
          </button>
        </div>

        {error && <div className="error-message">⚠️ {error}</div>}

        {diagnosis && (
          <div className="diagnosis-result">
            <div className="code-header">
              <span className="code-badge">{diagnosis.code}</span>
              <h3>{diagnosis.title}</h3>
            </div>

            <UrgencyIndicator
              danger={diagnosis.danger}
              canDrive={diagnosis.canDrive}
              urgency={diagnosis.urgency}
            />

            <AdvicePanel
              diagnosis={diagnosis}
              code={diagnosis.code}
            />
          </div>
        )}
      </div>
    </div>
  );
}
