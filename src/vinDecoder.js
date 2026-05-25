/**
 * VIN DECODER
 * Декодирование VIN и автоматическое заполнение данных об автомобиле
 */

const VIN_MAKES = {
  "1": "USA",
  "2": "Canada",
  "3": "Mexico",
  "4": "USA",
  "5": "USA",
  "6": "Australia",
  "7": "Australia",
  "8": "Argentina",
  "9": "Brazil",
  "J": "Japan",
  "K": "Korea",
  "L": "Taiwan",
  "M": "Malaysia",
  "S": "UK",
  "T": "Switzerland",
  "V": "France",
  "W": "Germany",
  "X": "Germany",
  "Y": "Sweden",
  "Z": "Italy",
};

const VIN_MAKES_DETAILED = {
  "1G": "General Motors (USA)",
  "1GT": "GMC (USA)",
  "1GC": "Chevrolet (USA)",
  "1GY": "Cadillac (USA)",
  "2G": "General Motors (Canada)",
  "2M": "Chrysler/Dodge (Canada)",
  "3G": "General Motors (Mexico)",
  "4T": "Toyota (USA)",
  "4S": "Suzuki (USA)",
  "5T": "Toyota (USA)",
  "5L": "Ford (USA)",
  "5J": "Honda (USA)",
  "5N": "Hyundai (USA)",
  "6G": "Mitsubishi (Australia)",
  "8A": "Fiat (Argentina)",
  "9B": "Ford (Brazil)",
  "JA": "Daihatsu (Japan)",
  "JH": "Honda (Japan)",
  "JM": "Mazda (Japan)",
  "JN": "Nissan (Japan)",
  "JS": "Suzuki (Japan)",
  "JT": "Toyota (Japan)",
  "JY": "Yamaha (Japan)",
  "KM": "Hyundai (South Korea)",
  "KN": "Kia (South Korea)",
  "LA": "Subaru (Japan)",
  "LE": "Subaru (Japan)",
  "LV": "Dacia (Romania)",
  "MA": "Mahindra (India)",
  "RU": "Russia",
  "SA": "Volvo (Sweden)",
  "SB": "Subaru (Japan)",
  "TM": "Isuzu (Japan)",
  "TR": "Triumph (UK)",
  "UU": "Lamborghini (Italy)",
  "VA": "Rolls-Royce (UK)",
  "VF": "Peugeot (France)",
  "VR": "Volkswagen (Germany)",
  "VS": "Rolls-Royce (UK)",
  "W0": "Volkswagen (Germany)",
  "WA": "Audi (Germany)",
  "WB": "BMW (Germany)",
  "WD": "Mercedes-Benz (Germany)",
  "WP": "Porsche (Germany)",
  "XE": "Jaguar (UK)",
  "XL": "Jaguar (UK)",
  "XW": "Rover (UK)",
  "YA": "Saab (Sweden)",
  "YB": "Saab (Sweden)",
  "YS": "Saab (Sweden)",
  "YV": "Volvo (Sweden)",
  "ZAR": "Rolls-Royce (UK)",
  "ZDF": "Ferrari (Italy)",
  "ZFF": "Ferrari (Italy)",
  "ZLA": "Lamborghini (Italy)",
  "ZLR": "Maserati (Italy)",
};

export function decodeVin(vin) {
  vin = vin.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17);

  if (vin.length < 3) {
    return null;
  }

  const wmi = vin.slice(0, 3);
  const vds = vin.slice(3, 9);
  const vis = vin.slice(9, 17);

  // Определяем страну/производителя
  const country = VIN_MAKES[vin[0]] || "Unknown";
  const maker = VIN_MAKES_DETAILED[vin.slice(0, 2)] || VIN_MAKES_DETAILED[vin[0]] || "Unknown";

  // Год выпуска (позиция 10)
  const yearChar = vin[9];
  const yearMap = {
    A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015, G: 2016,
    H: 2017, J: 2018, K: 2019, L: 2020, M: 2021, N: 2022, P: 2023,
    R: 2024, S: 2025, T: 2026, V: 2027, W: 2028, X: 2029, Y: 2030,
    "1": 2001, "2": 2002, "3": 2003, "4": 2004, "5": 2005, "6": 2006,
    "7": 2007, "8": 2008, "9": 2009,
  };
  const year = yearMap[yearChar];

  // Завод (позиция 11)
  const plantCode = vin[10];

  return {
    vin: vin,
    country: country,
    maker: maker,
    year: year || "Unknown",
    plant: plantCode,
    wmi: wmi,
    vds: vds,
    vis: vis,
  };
}

export function applyVinToCar(car, vin) {
  const decoded = decodeVin(vin);
  if (!decoded || decoded.year === "Unknown") {
    return { ...car, vin };
  }

  // Пытаемся извлечь марку из maker
  let make = "Unknown";
  if (decoded.maker.includes("Toyota")) make = "Toyota";
  else if (decoded.maker.includes("Honda")) make = "Honda";
  else if (decoded.maker.includes("Mazda")) make = "Mazda";
  else if (decoded.maker.includes("Nissan")) make = "Nissan";
  else if (decoded.maker.includes("Subaru")) make = "Subaru";
  else if (decoded.maker.includes("Suzuki")) make = "Suzuki";
  else if (decoded.maker.includes("Ford")) make = "Ford";
  else if (decoded.maker.includes("Chevrolet")) make = "Chevrolet";
  else if (decoded.maker.includes("Dodge")) make = "Dodge";
  else if (decoded.maker.includes("GMC")) make = "GMC";
  else if (decoded.maker.includes("Cadillac")) make = "Cadillac";
  else if (decoded.maker.includes("Volkswagen")) make = "Volkswagen";
  else if (decoded.maker.includes("BMW")) make = "BMW";
  else if (decoded.maker.includes("Mercedes")) make = "Mercedes-Benz";
  else if (decoded.maker.includes("Audi")) make = "Audi";
  else if (decoded.maker.includes("Porsche")) make = "Porsche";
  else if (decoded.maker.includes("Jaguar")) make = "Jaguar";
  else if (decoded.maker.includes("Peugeot")) make = "Peugeot";
  else if (decoded.maker.includes("Renault")) make = "Renault";
  else if (decoded.maker.includes("Fiat")) make = "Fiat";
  else if (decoded.maker.includes("Volvo")) make = "Volvo";
  else if (decoded.maker.includes("Saab")) make = "Saab";
  else if (decoded.maker.includes("Hyundai")) make = "Hyundai";
  else if (decoded.maker.includes("Kia")) make = "Kia";
  else if (decoded.maker.includes("Mitsubishi")) make = "Mitsubishi";
  else if (decoded.maker.includes("Daihatsu")) make = "Daihatsu";

  return {
    ...car,
    vin: vin,
    year: decoded.year || car.year,
    make: make !== "Unknown" ? make : car.make,
  };
}
