// Source: MoRTH India (petrol car average)
// Source: ARAI India (motorcycle/scooter petrol average)
// Source: DMRC Environmental Report (Delhi Metro)
// Source: Indian public bus average study
// Source: ARAI India (CNG auto-rickshaw)
// Source: ICAO (Per km short-haul flight)
// Source: CEA India 2023 (Indian grid average)
// Source: Indian consumer goods average carbon intensity study
// Source: World Bank 2023 (India average annual footprint benchmarks)

// Transport (kg CO2 per km)
export const TRANSPORT_FACTORS = {
  car: 0.192,           // Average Indian petrol car (MoRTH India)
  bike: 0.103,          // Motorcycle/scooter (ARAI India)
  motorcycle: 0.103,    // Alias for motorcycle dropdown support
  metro: 0.027,         // Delhi Metro (DMRC data)
  bus: 0.089,           // Indian public bus
  auto: 0.132,          // Auto-rickshaw (CNG) (ARAI India)
  auto_rickshaw: 0.132, // Alias for auto-rickshaw dropdown support
  walk: 0,
  walking: 0,           // Alias for walking dropdown support
  cycle: 0,
  bicycle: 0,           // Alias for bicycle dropdown support
  flight: 0.255,        // Per km, short-haul
};

// Food (kg CO2 per meal)
export const FOOD_FACTORS = {
  vegetarian: 0.7,      // Our World in Data (India adjusted)
  chicken: 2.4,         // FAO / Indian poultry average
  beef: 6.5,            // FAO / South Asian cattle average
  vegan: 0.4,           // Our World in Data (India adjusted)
};

// Electricity (kg CO2 per kWh) - Indian grid average
// Source: CEA India 2023
export const ELECTRICITY_FACTOR = 0.82;

// Shopping (kg CO2 per ₹1000 spent)
// Source: Indian consumer goods carbon intensity average
export const SHOPPING_FACTOR = 0.45;

// India average annual footprint for comparison
// Source: World Bank 2023
export const INDIA_AVERAGE_ANNUAL_KG = 1900;
export const INDIA_AVERAGE_MONTHLY_KG = 158.3;
export const INDIA_AVERAGE_DAILY_KG = 5.2;
