import { useState } from "react";

export function makeNewCarId() {
  return "car_" + Date.now();
}

export function makeEmptyCar() {
  return {
    id: makeNewCarId(),
    name: "",
    brand: "",
    model: "",
    year: "",
    vin: "",
  };
}

export default function GarageScreen({ car, setCar, onClose }) {
  const [cars, setCars] = useState(car ? [car] : []);
  const [activeCar, setActiveCar] = useState(car || null);

  function addCar() {
    const newCar = makeEmptyCar();
    setCars((p) => [...p, newCar]);
    setActiveCar(newCar);
    if (setCar) setCar(newCar);
  }

  function updateCar(id, field, value) {
    setCars((p) =>
      p.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );

    if (activeCar?.id === id) {
      setActiveCar((p) => ({ ...p, [field]: value }));
      if (setCar) setCar({ ...activeCar, [field]: value });
    }
  }

  return (
    <div style={{ padding: 20, background: "#111", color: "#fff", minHeight: "100vh" }}>
      <h2>Garage</h2>

      <button onClick={addCar}>+ Add car</button>
      <button onClick={onClose}>Close</button>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        {cars.map((c) => (
          <div
            key={c.id}
            onClick={() => setActiveCar(c)}
            style={{
              padding: 10,
              border: "1px solid #444",
              cursor: "pointer",
              background: activeCar?.id === c.id ? "#333" : "#222",
            }}
          >
            {c.brand || "Car"} {c.model}
          </div>
        ))}
      </div>

      {activeCar && (
        <div style={{ marginTop: 20 }}>
          <input
            placeholder="Brand"
            value={activeCar.brand}
            onChange={(e) => updateCar(activeCar.id, "brand", e.target.value)}
          />

          <input
            placeholder="Model"
            value={activeCar.model}
            onChange={(e) => updateCar(activeCar.id, "model", e.target.value)}
          />

          <input
            placeholder="Year"
            value={activeCar.year}
            onChange={(e) => updateCar(activeCar.id, "year", e.target.value)}
          />

          <input
            placeholder="VIN"
            value={activeCar.vin}
            onChange={(e) => updateCar(activeCar.id, "vin", e.target.value)}
          />
        </div>
      )}
    </div>
  );
}