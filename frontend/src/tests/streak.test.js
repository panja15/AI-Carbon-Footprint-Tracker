import { calculateStreak } from '../utils/calculations.js';

describe('Streak Calculator Unit Tests', () => {
  // Helper to get formatted date string offset from today
  function getDateString(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().split('T')[0];
  }

  test('3 consecutive days should yield streak = 3', () => {
    const logs = [
      { date: getDateString(0) }, // Today
      { date: getDateString(1) }, // Yesterday
      { date: getDateString(2) }  // Day before yesterday
    ];
    expect(calculateStreak(logs)).toBe(3);
  });

  test('Gap after day 2 (today logged, yesterday missed, previous consecutive days) should reset streak to 1', () => {
    // 2 days logged (e.g. 2 days ago and 3 days ago), then missed yesterday, logged today
    const logs = [
      { date: getDateString(0) }, // Today (day 1 of new streak)
      { date: getDateString(2) }, // Gap yesterday, previous log 2 days ago
      { date: getDateString(3) }  // previous log 3 days ago
    ];
    expect(calculateStreak(logs)).toBe(1);
  });

  test('No logs should yield streak = 0', () => {
    expect(calculateStreak([])).toBe(0);
  });

  test('Today only should yield streak = 1', () => {
    const logs = [
      { date: getDateString(0) }
    ];
    expect(calculateStreak(logs)).toBe(1);
  });
});
