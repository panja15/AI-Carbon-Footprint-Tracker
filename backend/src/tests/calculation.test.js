import {
  calculateTransportEmission,
  calculateFoodEmission,
  calculateElectricityEmission,
  calculateTotalEmission,
  calculateBaselineMonthlyFootprint,
  calculateWhatIfSavings,
  calculateForecast,
  calculateBudgetStatus,
  calculateEquivalents
} from '../services/calculation.service.js';

describe('Carbon Emission Calculations', () => {
  test('should calculate transport emission correctly based on distance and type', () => {
    // Car = 0.192
    expect(calculateTransportEmission(10, 'Car')).toBe(1.92);
    // Metro = 0.027
    expect(calculateTransportEmission(50, 'Metro')).toBe(1.35);
    // Bicycle = 0
    expect(calculateTransportEmission(20, 'Bicycle')).toBe(0);
    // Unknown transport type defaults factor to 0
    expect(calculateTransportEmission(15, 'Hovercraft')).toBe(0);
  });

  test('should calculate food emission correctly based on meal count and diet type', () => {
    // Vegetarian = 0.7
    expect(calculateFoodEmission(3, 'Vegetarian')).toBe(2.1);
    // Chicken = 2.4
    expect(calculateFoodEmission(2, 'Chicken')).toBe(4.8);
    // Beef = 6.5
    expect(calculateFoodEmission(1, 'Beef')).toBe(6.5);
  });

  test('should calculate electricity emission correctly based on kWh', () => {
    // Grid avg = 0.82
    expect(calculateElectricityEmission(100)).toBe(82);
    expect(calculateElectricityEmission(0)).toBe(0);
  });

  test('should sum up total emissions correctly', () => {
    expect(calculateTotalEmission(10, 20, 30)).toBe(60);
  });

  test('should calculate profile baseline monthly footprint correctly', () => {
    const profile = {
      transport_type: 'Car',
      daily_distance: 10,
      diet_type: 'Vegetarian',
      household_size: 4,
      electricity_usage: 100
    };
    
    // Transport monthly = 10 * 0.192 * 30 = 57.6
    // Food monthly = 3 * 30 * 0.7 = 63.0
    // Electricity monthly = 100 * 0.82 = 82
    // Total = 57.6 + 63.0 + 82 = 202.6
    const baseline = calculateBaselineMonthlyFootprint(profile);
    expect(baseline.transport_emission).toBe(57.6);
    expect(baseline.food_emission).toBe(63.0);
    expect(baseline.electricity_emission).toBe(82.0);
    expect(baseline.total_emission).toBe(202.6);
  });
});

describe('What-If Simulator', () => {
  test('should calculate projected savings correctly', () => {
    // Current: Car (0.192), Replacement: Metro (0.027), Distance: 20, Frequency: 3
    // savingsPerTrip = (0.192 - 0.027) * 20 = 0.165 * 20 = 3.3
    // weeklySavings = 3.3 * 3 = 9.9
    // monthlySavings = 9.9 * 4 = 39.6
    // yearlySavings = 39.6 * 12 = 475.2
    const savings = calculateWhatIfSavings('Car', 'Metro', 20, 3);
    expect(savings.monthlySavings).toBe(39.6);
    expect(savings.yearlySavings).toBe(475.2);
  });
});

describe('Carbon Forecast', () => {
  test('should calculate moving average monthly and yearly projection', () => {
    // Daily average: 5.5 kg CO2
    // monthly = 5.5 * 30 = 165
    // yearly = 5.5 * 365 = 2007.5
    const forecast = calculateForecast(5.5);
    expect(forecast.monthlyForecast).toBe(165);
    expect(forecast.yearlyForecast).toBe(2007.5);
  });
});

describe('Carbon Budget Status', () => {
  test('should calculate remaining budget and usage percentage', () => {
    const target = 100;
    const current = 60;
    const status = calculateBudgetStatus(target, current);
    expect(status.remainingBudget).toBe(40);
    expect(status.budgetUsagePercent).toBe(60);
  });
});

describe('Real-World Equivalents Engine', () => {
  test('should calculate driving km, flight, and tree equivalents', () => {
    const co2 = 10;
    // drivingKm = 10 / 0.192 = 52.083
    // flights = 10 / 255 = 0.039
    // trees = 10 / 21 = 0.476
    const equivalents = calculateEquivalents(co2);
    expect(equivalents.drivingKm).toBe(52.083);
    expect(equivalents.flights).toBe(0.039);
    expect(equivalents.trees).toBe(0.476);
  });
});
