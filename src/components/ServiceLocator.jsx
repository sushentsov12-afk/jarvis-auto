import React, { useState } from 'react';
import './ServiceLocator.css';

const MOCK_SERVICES = [
  { id: 1, name: 'АвтоСервис №1', city: 'Москва', rating: 4.8, price: 'средняя' },
  { id: 2, name: 'БМВ Центр', city: 'Москва', rating: 4.6, price: 'высокая' },
  { id: 3, name: 'Универсальный сервис', city: 'Москва', rating: 4.2, price: 'низкая' },
  { id: 4, name: 'ТехnoСервис', city: 'Санкт-Петербург', rating: 4.9, price: 'средняя' },
  { id: 5, name: 'Быстрый ремонт', city: 'Санкт-Петербург', rating: 4.1, price: 'низкая' },
];

export default function ServiceLocator() {
  const [city, setCity] = useState('Москва');
  const [filtered, setFiltered] = useState(
    MOCK_SERVICES.filter((s) => s.city === 'Москва')
  );

  const handleCityChange = (e) => {
    const selectedCity = e.target.value;
    setCity(selectedCity);
    setFiltered(MOCK_SERVICES.filter((s) => s.city === selectedCity));
  };

  const getPriceIcon = (price) => {
    switch (price) {
      case 'низкая':
        return '💰';
      case 'средняя':
        return '💰💰';
      case 'высокая':
        return '💰💰💰';
      default:
        return '❓';
    }
  };

  return (
    <div className="service-locator">
      <h2>🔧 Найти сервис</h2>
      <p className="service-subtitle">Выберите город и найдите ближайший автосервис</p>

      <div className="city-selector">
        <label>Выберите город:</label>
        <select value={city} onChange={handleCityChange} className="city-select">
          <option>Москва</option>
          <option>Санкт-Петербург</option>
          <option>Казань</option>
          <option>Екатеринбург</option>
        </select>
      </div>

      <div className="services-list">
        {filtered.length > 0 ? (
          filtered.map((service) => (
            <div key={service.id} className="service-card">
              <div className="service-header">
                <h4>{service.name}</h4>
                <span className="rating">⭐ {service.rating}</span>
              </div>
              <div className="service-details">
                <p>📍 {service.city}</p>
                <p>💵 Цены: {getPriceIcon(service.price)}</p>
              </div>
              <button className="contact-btn">☎️ Позвонить</button>
            </div>
          ))
        ) : (
          <p className="no-services">Сервисы не найдены</p>
        )}
      </div>
    </div>
  );
}
