import { TRANSPORT_FACTORS, FOOD_FACTORS } from '../lib/emissionFactors.js';
import { normalizeTransportType, normalizeDietType } from './calculation.service.js';

/**
 * Compare travel modes.
 * @param {number} distance 
 * @param {string} modeA 
 * @param {string} modeB 
 */
export function compareTravel(distance, modeA, modeB) {
  const normA = normalizeTransportType(modeA);
  const normB = normalizeTransportType(modeB);
  
  const factorA = TRANSPORT_FACTORS[normA] !== undefined ? TRANSPORT_FACTORS[normA] : 0.192;
  const factorB = TRANSPORT_FACTORS[normB] !== undefined ? TRANSPORT_FACTORS[normB] : 0.027;

  const co2A = parseFloat((distance * factorA).toFixed(3));
  const co2B = parseFloat((distance * factorB).toFixed(3));

  let recommended = modeA;
  let reductionPercent = 0;

  if (co2B < co2A) {
    recommended = modeB;
    reductionPercent = co2A > 0 ? Math.round(((co2A - co2B) / co2A) * 100) : 0;
  } else if (co2A < co2B) {
    recommended = modeA;
    reductionPercent = co2B > 0 ? Math.round(((co2B - co2A) / co2B) * 100) : 0;
  }

  return {
    category: 'travel',
    distance,
    optionA: { mode: modeA, co2Kg: co2A },
    optionB: { mode: modeB, co2Kg: co2B },
    recommended,
    reductionPercent
  };
}

/**
 * Compare working from home vs commuting.
 * Assumes a commute is a round-trip of the given daily distance.
 * @param {number} distance 
 * @param {string} transportMode 
 */
export function compareCommute(distance, transportMode) {
  const normMode = normalizeTransportType(transportMode);
  const factor = TRANSPORT_FACTORS[normMode] !== undefined ? TRANSPORT_FACTORS[normMode] : 0.192;

  // Round-trip commute distance
  const commuteDistance = distance * 2;
  const transportCo2 = commuteDistance * factor;

  // WFH has a minor laptop electricity footprint (0.065 kg CO2 = ~0.08 kWh * 0.82 kg/kWh)
  const wfhCo2 = 0.065;
  const commuteCo2 = transportCo2 + wfhCo2;

  const savings = transportCo2; // transport savings
  const reductionPercent = commuteCo2 > 0 ? Math.round((savings / commuteCo2) * 100) : 0;

  return {
    category: 'wfh',
    distance,
    transportMode,
    optionA: { mode: 'Office Commute', co2Kg: parseFloat(commuteCo2.toFixed(3)) },
    optionB: { mode: 'Work From Home', co2Kg: parseFloat(wfhCo2.toFixed(3)) },
    recommended: 'Work From Home',
    reductionPercent
  };
}

/**
 * Compare cooking at home vs ordering delivery.
 * Ordering delivery adds food delivery travel emissions.
 * @param {string} mealCook 
 * @param {string} mealOrder 
 * @param {number} deliveryDistance (default 5km)
 */
export function compareFood(mealCook, mealOrder, deliveryDistance = 5) {
  const normCook = normalizeDietType(mealCook);
  const normOrder = normalizeDietType(mealOrder);

  const factorCook = FOOD_FACTORS[normCook] !== undefined ? FOOD_FACTORS[normCook] : 0.7;
  const factorOrder = FOOD_FACTORS[normOrder] !== undefined ? FOOD_FACTORS[normOrder] : 0.7;

  // Delivery is assumed to be via a standard motorcycle delivery person (0.103 kg CO2/km)
  const deliveryFactor = TRANSPORT_FACTORS['motorcycle'] || 0.103;
  const deliveryCo2 = deliveryDistance * deliveryFactor;

  const co2Cook = factorCook;
  const co2Order = factorOrder + deliveryCo2;

  let recommended = 'Cook at Home';
  let reductionPercent = 0;

  if (co2Cook < co2Order) {
    recommended = 'Cook at Home';
    reductionPercent = co2Order > 0 ? Math.round(((co2Order - co2Cook) / co2Order) * 100) : 0;
  } else if (co2Order < co2Cook) {
    recommended = 'Order Food';
    reductionPercent = co2Cook > 0 ? Math.round(((co2Cook - co2Order) / co2Cook) * 100) : 0;
  }

  return {
    category: 'food',
    mealCook,
    mealOrder,
    deliveryDistance,
    optionA: { mode: `Cook ${mealCook} at Home`, co2Kg: parseFloat(co2Cook.toFixed(3)) },
    optionB: { mode: `Order ${mealOrder} (Delivery)`, co2Kg: parseFloat(co2Order.toFixed(3)) },
    recommended,
    reductionPercent
  };
}
