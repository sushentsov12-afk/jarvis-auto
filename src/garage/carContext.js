import { createContext, useContext, useState } from "react";

const CarContext = createContext();

export function CarProvider({ children }) {
  const [activeCar, setActiveCar] = useState(null);

  return (
    <CarContext.Provider value={{ activeCar, setActiveCar }}>
      {children}
    </CarContext.Provider>
  );
}

export function useCar() {
  return useContext(CarContext);
}
