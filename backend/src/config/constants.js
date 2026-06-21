// Single source of truth for carbon emission constants

export const TRANSPORT_FACTORS = {
  car: 0.192,
  metro: 0.041,
  bus: 0.105,
  auto_rickshaw: 0.120, // auto rickshaw maps to auto_rickshaw
  motorcycle: 0.103,
  bicycle: 0,
  walking: 0
};

export const FOOD_FACTORS = {
  vegetarian: 1.5,
  chicken: 3.0,
  beef: 15.0
};

export const ELECTRICITY_FACTOR = 0.82; // Indian Grid Average: 0.82 kg CO2 per kWh

// Baselines for Equivalents Engine
export const EQUIVALENTS = {
  CAR_BASELINE: 0.192, // kg CO2 / km
};
