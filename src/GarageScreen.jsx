import { useState } from "react";

export function makeNewCarId() {
  return "car_" + Date.now();
}

export function makeEmptyCar() {
  return {
    id: makeNewCarId(),
    name: "Без названия",
    brand: "",
    model: "",
    year: "",
    vin: "",
  };
}

export default function GarageScreen() {
  const [cars, setCars] = useState([]);
  const [activeCarId, setActiveCarId] = useState(null);

  function addCar() {
    const car = makeEmptyCar();
    setCars((prev) => [...prev, car]);
    setActiveCarId(car.id);
  }

  function updateCar(id, field, value) {
    setCars((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      )
    );
  }

  const activeCar = cars.find((c) => c.id === activeCarId);

  return (
    <div style={{ padding: 20, color: "white", background: "#111", minHeight: "100vh" }}>
      
      <h2>Гараж</h2>

      <button onClick={addCar} style={{ padding: 10, marginBottom: 20 }}>
        + Добавить авто
      </button>

      <div style={{ display: "flex", gap: 10 }}>
        {cars.map((car) => (
          <div
            key={car.id}
            onClick={() => setActiveCarId(car.id)}
            style={{
              padding: 10,
              border: "1px solid gray",
              cursor: "pointer",
              background: car.id === activeCarId ? "#333" : "#222",
            }}
          >
            {car.brand || "Авто"} {car.model}
          </div>
        ))}
      </div>

      {activeCar && (
        <div style={{ marginTop: 20 }}>
          
          <h3>Редактирование авто</h3>

          <input
            placeholder="Марка"
            value={activeCar.brand}
            onChange={(e) =>
              updateCar(activeCar.id, "brand", e.target.value)
            }
          />

          <input
            placeholder="Модель"
            value={activeCar.model}
            onChange={(e) =>
              updateCar(activeCar.id, "model", e.target.value)
            }
          />

          <input
            placeholder="Год"
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
