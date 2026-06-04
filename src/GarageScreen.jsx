import { useState } from "react";
import { useCar } from "./garage/carContext";

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

export default function GarageScreen() {
  const [cars, setCars] = useState([]);
  const { activeCar, setActiveCar } = useCar();

  function addCar() {
    const car = makeEmptyCar();
    setCars((p) => [...p, car]);
    setActiveCar(car);
  }

  function updateCar(id, field, value) {
    setCars((p) =>
      p.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  return (
    <div style={{ padding: 20, background: "#111", color: "#fff", minHeight: "100vh" }}>
      <h2>Garage</h2>

      <button onClick={addCar}>+ Add car</button>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        {cars.map((car) => (
          <div
            key={car.id}
            onClick={() => setActiveCar(car)}
            style={{
              padding: 10,
              border: "1px solid #444",
              cursor: "pointer",
              background: activeCar?.id === car.id ? "#333" : "#222",
            }}
          >
            {car.brand || "Car"} {car.model}
          </div>
        ))}
      </div>

      {activeCar && (
        <div style={{ marginTop: 20 }}>
          <input
            placeholder="Brand"
            value={activeCar.brand}
            onChange={(e) =>
              updateCar(activeCar.id, "brand", e.target.value)
            }
          />

          <input
            placeholder="Model"
            value={activeCar.model}
            onChange={(e) =>
              updateCar(activeCar.id, "model", e.target.value)
            }
          />

          <input
            placeholder="Year"
            value={activeCar.year}
            onChange={(e) =>
              updateCar(activeCar.id, "year", e.target.value)
            }
          />

          <input
            placeholder="VIN"
            value={activeCar.vin}
            onChange={(e) =>
              updateCar(activeCar.id, "vin", e.target.value)
            }
          />
        </div>
      )}
    </div>
  );
}
