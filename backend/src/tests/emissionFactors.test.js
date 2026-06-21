import {
  calculateTransportEmission,
  calculateFoodEmission,
  calculateElectricityEmission,
  calculateShoppingEmission,
  calculateTotalEmission
} from '../services/calculation.service.js';

describe('Emission Factors Unit Tests', () => {
  test('Car 10 km should emit 1.92 kg CO2', () => {
    expect(calculateTransportEmission(10, 'Car')).toBe(1.92);
  });

  test('Metro 10 km should emit 0.27 kg CO2', () => {
    expect(calculateTransportEmission(10, 'Metro')).toBe(0.27);
  });

  test('1 beef meal should emit 6.5 kg CO2', () => {
    expect(calculateFoodEmission(1, 'Beef')).toBe(6.5);
  });

  test('1 vegetarian meal should emit 0.7 kg CO2', () => {
    expect(calculateFoodEmission(1, 'Vegetarian')).toBe(0.7);
  });

  test('5 kWh electricity should emit 4.1 kg CO2', () => {
    expect(calculateElectricityEmission(5)).toBe(4.1);
  });

  test('₹2000 shopping should emit 0.9 kg CO2', () => {
    expect(calculateShoppingEmission(2000)).toBe(0.9);
  });

  test('Combined daily total test should sum all emissions correctly', () => {
    const transport = calculateTransportEmission(10, 'Car'); // 1.92
    const food = calculateFoodEmission(1, 'Vegetarian'); // 0.7
    const electricity = calculateElectricityEmission(5); // 4.1
    const shopping = calculateShoppingEmission(2000); // 0.9
    
    // Total = 1.92 + 0.7 + 4.1 + 0.9 = 7.62
    expect(calculateTotalEmission(transport, food, electricity, shopping)).toBe(7.62);
  });
});
