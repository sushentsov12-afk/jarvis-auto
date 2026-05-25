import React, { useState } from 'react';
import { decodeVIN } from '../vinDecoder';
import './CarManager.css';

export default function CarManager({ cars, onAddCar, onSelectCar }) {
  const [showForm, setShowForm] = useState(false);
  const [vinInput, setVinInput] = useState('');
  const [carName, setCarName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [decodedData, setDecodedData] = useState(null);

  const handleDecodeVIN = async () => {
    if (!vinInput.trim() || vinInput.length < 17) {
      setError('VIN должен быть 17 символов');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const decoded = decodeVIN(vinInput);
      setDecodedData(decoded);
      if (!carName) {
        setCarName(`${decoded.brand} ${decoded.year}`);
      }
    } catch (err) {
      setError('Не удалось декодировать VIN');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCar = () => {
    if (!carName || !vinInput) {
      setError('Заполните все поля');
      return;
    }

    const newCar = {
      id: Date.now(),
      name: carName,
      vin: vinInput,
      ...decodedData,
    };

    onAddCar(newCar);
    setVinInput('');
    setCarName('');
    setDecodedData(null);
    setShowForm(false);
  };

  return (
    <div className="car-manager">
      <h2>🚗 Мои автомобили</h2>

      <div className="cars-list">
        {cars && cars.length > 0 ? (
          cars.map((car) => (
            <div
              key={car.id}
              className="car-item"
              onClick={() => onSelectCar?.(car)}
            >
              <div className="car-icon">🚗</div>
              <div className="car-info">
                <h4>{car.name}</h4>
                <p className="vin-text">VIN: {car.vin}</p>
                {car.year && <p className="car-year">Год: {car.year}</p>}
              </div>
              <span className="arrow">→</span>
            </div>
          ))
        ) : (
          <p className="no-cars">У вас еще нет автомобилей</p>
        )}
      </div>

      {!showForm ? (
        <button className="add-car-btn" onClick={() => setShowForm(true)}>
          ➕ Добавить автомобиль
        </button>
      ) : (
        <div className="car-form">
          <h3>Добавить новый автомобиль</h3>

          <div className="form-group">
            <label>VIN номер (17 символов)</label>
            <input
              type="text"
              value={vinInput}
              onChange={(e) => setVinInput(e.target.value.toUpperCase())}
              placeholder="Например: WBADT43452G123456"
              maxLength="17"
              className="form-input"
            />
            <button
              onClick={handleDecodeVIN}
              disabled={loading}
              className="decode-btn"
            >
              {loading ? '⏳ Декодирую...' : '🔓 Декодировать VIN'}
            </button>
          </div>

          {decodedData && (
            <div className="decoded-info">
              <p>🏭 <strong>{decodedData.brand}</strong> - {decodedData.country}</p>
              <p>📅 Год: {decodedData.year}</p>
              <p>🏢 Завод: {decodedData.plant}</p>
            </div>
          )}

          <div className="form-group">
            <label>Название автомобиля</label>
            <input
              type="text"
              value={carName}
              onChange={(e) => setCarName(e.target.value)}
              placeholder="Например: Мой первый BMW"
              className="form-input"
            />
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          <div className="form-buttons">
            <button
              onClick={handleAddCar}
              className="submit-btn"
            >
              ✅ Добавить
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setError(null);
                setVinInput('');
                setCarName('');
              }}
              className="cancel-btn"
            >
              ❌ Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
