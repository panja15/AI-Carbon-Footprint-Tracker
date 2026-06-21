import { getEcoGrade } from '../utils/calculations.js';

describe('Eco-Score Grade Unit Tests', () => {
  test('1.2 kg/day should map to A+ grade', () => {
    const score = getEcoGrade(1.2);
    expect(score.grade).toBe('A+');
  });

  test('2.1 kg/day should map to A grade', () => {
    const score = getEcoGrade(2.1);
    expect(score.grade).toBe('A');
  });

  test('3.2 kg/day should map to B grade', () => {
    const score = getEcoGrade(3.2);
    expect(score.grade).toBe('B');
  });

  test('4.2 kg/day should map to C grade', () => {
    const score = getEcoGrade(4.2);
    expect(score.grade).toBe('C');
  });

  test('5.2 kg/day should map to D grade', () => {
    const score = getEcoGrade(5.2);
    expect(score.grade).toBe('D');
  });

  test('6.5 kg/day should map to F grade', () => {
    const score = getEcoGrade(6.5);
    expect(score.grade).toBe('F');
  });
});
