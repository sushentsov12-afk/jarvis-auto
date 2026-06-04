export function makeNewCarId() {
  return "car_" + Date.now();
}

export function makeEmptyCar() {
  return {
    id: makeNewCarId(),
    name: "New Car",
    data: {}
  };
}

export default function GarageScreen() {
  return null;
}
