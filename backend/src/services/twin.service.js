import { calculateBaselineMonthlyFootprint } from './calculation.service.js';

/**
 * Maps daily average carbon footprint to a sustainability persona.
 * @param {number} dailyAverage 
 * @returns {string}
 */
export function getSustainabilityPersona(dailyAverage) {
  if (dailyAverage <= 1.5) return 'Low Impact Champion';
  if (dailyAverage <= 2.5) return 'Green Custodian';
  if (dailyAverage <= 3.5) return 'Eco Advocate';
  if (dailyAverage <= 4.5) return 'Conscious Consumer';
  if (dailyAverage <= 5.5) return 'Carbon Moderate';
  return 'High Intensity Consumer';
}

/**
 * Calculates current footprints and breakdowns.
 * @param {object} profile 
 * @param {Array} logs (last 30 days)
 * @returns {object}
 */
export function calculateCurrentYou(profile, logs = []) {
  let dailyAverage = 0;
  let breakdown = { transport: 0, food: 0, electricity: 0, shopping: 0 };

  if (logs && logs.length > 0) {
    const totalLogsEmission = logs.reduce((sum, log) => sum + log.total_emission, 0);
    dailyAverage = totalLogsEmission / logs.length;

    breakdown.transport = logs.reduce((sum, log) => sum + log.transport_emission, 0) / logs.length * 30;
    breakdown.food = logs.reduce((sum, log) => sum + log.food_emission, 0) / logs.length * 30;
    breakdown.electricity = logs.reduce((sum, log) => sum + log.electricity_emission, 0) / logs.length * 30;
    breakdown.shopping = logs.reduce((sum, log) => sum + (log.shopping_emission || 0), 0) / logs.length * 30;
  } else if (profile) {
    const baseline = calculateBaselineMonthlyFootprint(profile);
    dailyAverage = baseline.total_emission / 30;

    breakdown.transport = baseline.transport_emission;
    breakdown.food = baseline.food_emission;
    breakdown.electricity = baseline.electricity_emission;
    breakdown.shopping = baseline.digital_emission || 0; // map digital to shopping or keep separate
  }

  const monthlyFootprint = dailyAverage * 30;
  const annualFootprint = dailyAverage * 365;

  return {
    dailyAverage: parseFloat(dailyAverage.toFixed(3)),
    monthlyFootprint: parseFloat(monthlyFootprint.toFixed(3)),
    annualFootprint: parseFloat(annualFootprint.toFixed(3)),
    breakdown: {
      transport: parseFloat(breakdown.transport.toFixed(3)),
      food: parseFloat(breakdown.food.toFixed(3)),
      electricity: parseFloat(breakdown.electricity.toFixed(3)),
      shopping: parseFloat(breakdown.shopping.toFixed(3))
    },
    persona: getSustainabilityPersona(dailyAverage)
  };
}

/**
 * Calculates Future You target footprints, improvement percentage, and timeline.
 * @param {object} currentYou 
 * @param {string} goalType 
 * @param {object} profile 
 */
export function calculateFutureYou(currentYou, goalType = 'reduce_10', profile = null) {
  let targetMonthlyFootprint = currentYou.monthlyFootprint * 0.90; // default 10%
  let timeline = '1 month';

  if (goalType === 'reduce_20') {
    targetMonthlyFootprint = currentYou.monthlyFootprint * 0.80;
    timeline = '2 months';
  } else if (goalType === 'eco_optimizer') {
    targetMonthlyFootprint = 2.0 * 30; // 60 kg/month
    timeline = '3 months';
  } else if (goalType === 'low_impact') {
    targetMonthlyFootprint = 1.5 * 30; // 45 kg/month
    timeline = '6 months';
  }

  // Ensure target doesn't exceed current
  if (targetMonthlyFootprint > currentYou.monthlyFootprint) {
    targetMonthlyFootprint = currentYou.monthlyFootprint;
  }

  const targetAnnualFootprint = (targetMonthlyFootprint / 30) * 365;
  const monthlySavings = currentYou.monthlyFootprint - targetMonthlyFootprint;
  const annualSavings = currentYou.annualFootprint - targetAnnualFootprint;

  const improvementPercent = currentYou.monthlyFootprint > 0
    ? Math.round((monthlySavings / currentYou.monthlyFootprint) * 100)
    : 0;

  // Formulate required lifestyle changes based on profile details
  const requiredChanges = [];
  
  if (profile && monthlySavings > 0) {
    const isDriving = ['car', 'motorcycle', 'bike', 'auto', 'auto_rickshaw'].includes(profile.transport_type.toLowerCase());
    
    if (isDriving && profile.daily_distance > 0) {
      requiredChanges.push(`Commute by Metro/Bus instead of ${profile.transport_type} for at least 3 days per week.`);
    }

    if (['beef', 'chicken'].includes(profile.diet_type.toLowerCase())) {
      requiredChanges.push('Transition from high-carbon meat meals to Vegetarian or Vegan alternatives 3 days per week.');
    }

    if (profile.electricity_usage > 100) {
      requiredChanges.push('Reduce home grid electricity usage by 15% through smart thermostats and energy-efficient habits.');
    }
  }

  // Fallback default suggestions if no profile properties matched
  if (requiredChanges.length === 0) {
    requiredChanges.push('Reduce daily vehicle usage by carpooling or choosing public transit.');
    requiredChanges.push('Introduce more plant-based meals into your weekly diet.');
    requiredChanges.push('Unplug idle home electronics to cut down phantom energy draw.');
  }

  const futureDailyAverage = targetMonthlyFootprint / 30;

  return {
    goalType,
    dailyAverage: parseFloat(futureDailyAverage.toFixed(3)),
    monthlyFootprint: parseFloat(targetMonthlyFootprint.toFixed(3)),
    annualFootprint: parseFloat(targetAnnualFootprint.toFixed(3)),
    improvementPercent,
    annualSavings: parseFloat(annualSavings.toFixed(3)),
    timeline,
    requiredChanges,
    persona: getSustainabilityPersona(futureDailyAverage)
  };
}
