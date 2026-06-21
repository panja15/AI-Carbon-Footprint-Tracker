import { calculateWhatIfSavings } from '../services/calculation.service.js';

describe('What-If Simulator Unit Tests', () => {
  test('Car to Metro, 10 km, 3 trips/week should save 4.95 kg/week', () => {
    const savings = calculateWhatIfSavings('Car', 'Metro', 10, 3);
    const weeklySavings = parseFloat((savings.monthlySavings / 4).toFixed(3));
    expect(weeklySavings).toBe(4.95);
  });

  test('Car to Cycle, 5 km, 5 trips/week should save 4.8 kg/week', () => {
    const savings = calculateWhatIfSavings('Car', 'Bicycle', 5, 5); // alias Bicycle used in dropdown
    const weeklySavings = parseFloat((savings.monthlySavings / 4).toFixed(3));
    expect(weeklySavings).toBe(4.8);
  });

  test('Same method to same method should yield 0 savings', () => {
    const savings = calculateWhatIfSavings('Car', 'Car', 10, 3);
    expect(savings.monthlySavings).toBe(0);
    expect(savings.yearlySavings).toBe(0);
  });
});
