import { TRANSPORT_FACTORS, FOOD_FACTORS, ELECTRICITY_FACTOR, SHOPPING_FACTOR } from '../lib/emissionFactors.js';

/**
 * Standardizes transport type name to match the configuration keys.
 * @param {string} type 
 * @returns {string}
 */
export function normalizeTransportType(type) {
  if (!type) return 'walking';
  return type.toLowerCase().trim().replace(/\s+/g, '_');
}

/**
 * Standardizes diet type name to match the configuration keys.
 * @param {string} type 
 * @returns {string}
 */
export function normalizeDietType(type) {
  if (!type) return 'vegetarian';
  return type.toLowerCase().trim();
}

/**
 * Calculate transportation carbon emissions (kg CO2).
 * Formula: distanceKm * emissionFactor
 * @param {number} distanceKm 
 * @param {string} transportType 
 * @returns {number}
 */
export function calculateTransportEmission(distanceKm, transportType) {
  const normalized = normalizeTransportType(transportType);
  const factor = TRANSPORT_FACTORS[normalized] !== undefined ? TRANSPORT_FACTORS[normalized] : 0;
  return parseFloat((distanceKm * factor).toFixed(3));
}

/**
 * Calculate food carbon emissions (kg CO2).
 * Formula: mealCount * emissionFactor
 * @param {number} mealCount 
 * @param {string} mealType 
 * @returns {number}
 */
export function calculateFoodEmission(mealCount, mealType) {
  const normalized = normalizeDietType(mealType);
  const factor = FOOD_FACTORS[normalized] !== undefined ? FOOD_FACTORS[normalized] : 0;
  return parseFloat((mealCount * factor).toFixed(3));
}

/**
 * Calculate electricity carbon emissions (kg CO2).
 * Formula: kWh * 0.82
 * @param {number} kWh 
 * @returns {number}
 */
export function calculateElectricityEmission(kWh) {
  return parseFloat((kWh * ELECTRICITY_FACTOR).toFixed(3));
}

/**
 * Calculate shopping carbon emissions (kg CO2).
 * Formula: (amountSpent / 1000) * 0.45
 * @param {number} amountSpent
 * @returns {number}
 */
export function calculateShoppingEmission(amountSpent) {
  if (!amountSpent || isNaN(amountSpent) || amountSpent < 0) return 0;
  return parseFloat(((amountSpent / 1000) * SHOPPING_FACTOR).toFixed(3));
}

/**
 * Calculate total carbon emissions (kg CO2).
 * @param {number} transport 
 * @param {number} food 
 * @param {number} electricity 
 * @param {number} shopping
 * @returns {number}
 */
export function calculateTotalEmission(transport, food, electricity, shopping = 0) {
  return parseFloat((transport + food + electricity + shopping).toFixed(3));
}

/**
 * Calculate baseline monthly footprint from profile questionnaire answers.
 * TODO: Verify if food baseline assumes 3 meals per day and if electricity baseline should be divided by household size.
 * Currently, we assume 3 meals per day (90 meals per month) for food, and use the user's direct electricity usage.
 * @param {object} profile 
 * @returns {object}
 */
export function calculateBaselineMonthlyFootprint(profile) {
  const transportFactor = TRANSPORT_FACTORS[normalizeTransportType(profile.transport_type)] || 0;
  // If weekly_commute_frequency is specified, use commuteDays * 4.33 weeks per month. Otherwise default to 30 days.
  const commuteDaysPerWeek = profile.weekly_commute_frequency !== undefined && profile.weekly_commute_frequency !== null
    ? profile.weekly_commute_frequency
    : 7;
  const transportDays = profile.weekly_commute_frequency !== undefined && profile.weekly_commute_frequency !== null
    ? (commuteDaysPerWeek * 4.33)
    : 30;
  const transportEmission = profile.daily_distance * transportFactor * transportDays;

  const foodFactor = FOOD_FACTORS[normalizeDietType(profile.diet_type)] || 0;
  const meals = profile.meals_per_day !== undefined && profile.meals_per_day !== null
    ? profile.meals_per_day
    : 3;
  const foodEmission = meals * 30 * foodFactor;

  const electricityEmission = profile.electricity_usage * ELECTRICITY_FACTOR;

  // Digital Habits: AI usage frequency (0.0004 kg CO2 per request) + Video streaming (0 kg CO2 per hour)
  const aiUsage = profile.ai_usage_frequency !== undefined && profile.ai_usage_frequency !== null
    ? profile.ai_usage_frequency
    : 0;
  const videoStreaming = profile.video_streaming_usage !== undefined && profile.video_streaming_usage !== null
    ? profile.video_streaming_usage
    : 0;
  
  const digitalEmission = (aiUsage * 30 * 0.0004) + (videoStreaming * 30 * 0);

  const total = transportEmission + foodEmission + electricityEmission + digitalEmission;

  return {
    transport_emission: parseFloat(transportEmission.toFixed(3)),
    food_emission: parseFloat(foodEmission.toFixed(3)),
    electricity_emission: parseFloat(electricityEmission.toFixed(3)),
    digital_emission: parseFloat(digitalEmission.toFixed(3)),
    total_emission: parseFloat(total.toFixed(3))
  };
}

/**
 * What-If Simulator: Calculate savings from replacement behavior.
 * Formula:
 *   savingsPerTrip = (currentFactor - replacementFactor) * distance
 *   weeklySavings = savingsPerTrip * frequency
 *   monthlySavings = weeklySavings * 4
 *   yearlySavings = monthlySavings * 12
 * @param {string} currentType 
 * @param {string} replacementType 
 * @param {number} distance 
 * @param {number} frequency 
 * @returns {object}
 */
export function calculateWhatIfSavings(currentType, replacementType, distance, frequency) {
  const currentFactor = TRANSPORT_FACTORS[normalizeTransportType(currentType)] || 0;
  const replacementFactor = TRANSPORT_FACTORS[normalizeTransportType(replacementType)] || 0;

  if (replacementFactor >= currentFactor) {
    return {
      monthlySavings: 0,
      yearlySavings: 0
    };
  }

  const savingsPerTrip = (currentFactor - replacementFactor) * distance;
  const weeklySavings = savingsPerTrip * frequency;
  const monthlySavings = weeklySavings * 4;
  const yearlySavings = monthlySavings * 12;

  return {
    monthlySavings: parseFloat(monthlySavings.toFixed(3)),
    yearlySavings: parseFloat(yearlySavings.toFixed(3))
  };
}

/**
 * Carbon Forecast: Predict monthly and yearly emissions based on daily average.
 * Formula:
 *   monthlyForecast = dailyAverage * 30
 *   yearlyForecast = dailyAverage * 365
 * @param {number} dailyAverage 
 * @returns {object}
 */
export function calculateForecast(dailyAverage) {
  const monthlyForecast = dailyAverage * 30;
  const yearlyForecast = dailyAverage * 365;

  return {
    monthlyForecast: parseFloat(monthlyForecast.toFixed(3)),
    yearlyForecast: parseFloat(yearlyForecast.toFixed(3))
  };
}

/**
 * Carbon Budget: Calculate status against target.
 * Formula:
 *   remainingBudget = monthlyTarget - currentMonthEmission
 *   budgetUsagePercent = (currentMonthEmission / monthlyTarget) * 100
 * @param {number} monthlyTarget 
 * @param {number} currentMonthEmission 
 * @returns {object}
 */
export function calculateBudgetStatus(monthlyTarget, currentMonthEmission) {
  const remainingBudget = monthlyTarget - currentMonthEmission;
  const budgetUsagePercent = monthlyTarget > 0 ? (currentMonthEmission / monthlyTarget) * 100 : 0;

  return {
    remainingBudget: parseFloat(remainingBudget.toFixed(3)),
    budgetUsagePercent: parseFloat(budgetUsagePercent.toFixed(3))
  };
}

/**
 * Real-World Equivalents: Convert kg CO2 to understandable baselines.
 * Formulas:
 *   drivingKm = co2Amount / 0.192
 *   flights = co2Amount / 50  (PRD example: 50 kg CO2 = 1 flight equivalent)
 *   trees = co2Amount / 25     (PRD example: 100 kg CO2 = 4 trees annually, so 25 kg CO2 = 1 tree)
 * @param {number} co2Amount 
 * @returns {object}
 */
export function calculateEquivalents(co2Amount) {
  const drivingKm = co2Amount / 0.192;
  const flights = co2Amount / 255;
  const trees = co2Amount / 21;

  return {
    drivingKm: parseFloat(drivingKm.toFixed(3)),
    flights: parseFloat(flights.toFixed(3)),
    trees: parseFloat(trees.toFixed(3))
  };
}
