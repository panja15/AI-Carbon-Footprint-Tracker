/**
 * Analyze historical carbon logs to detect behavioral patterns.
 * Supported insights:
 * 1. Weekend emissions higher than weekday emissions
 * 2. Increasing emission trend (overall or category-specific)
 * 3. Decreasing emission trend
 * 4. Largest emission category (dominant contributor)
 * 
 * @param {Array<object>} logs 
 * @returns {Array<string>} List of pattern strings to pass to Gemini
 */
export function detectPatterns(logs) {
  if (!logs || logs.length === 0) {
    return [];
  }

  // Sort logs by date ascending
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));

  const findings = [];

  // 1. Weekend vs Weekday analysis
  let weekdaySum = 0;
  let weekdayCount = 0;
  let weekendSum = 0;
  let weekendCount = 0;

  sortedLogs.forEach(log => {
    const date = new Date(log.date);
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = (day === 0 || day === 6);
    
    if (isWeekend) {
      weekendSum += log.total_emission;
      weekendCount++;
    } else {
      weekdaySum += log.total_emission;
      weekdayCount++;
    }
  });

  if (weekdayCount > 0 && weekendCount > 0) {
    const weekdayAvg = weekdaySum / weekdayCount;
    const weekendAvg = weekendSum / weekendCount;
    
    if (weekendAvg > weekdayAvg) {
      const percentHigher = ((weekendAvg - weekdayAvg) / weekdayAvg) * 100;
      findings.push(`Weekend emissions are ${Math.round(percentHigher)}% higher than weekdays`);
    }
  }

  // 2. Largest emission category (Dominant contributor)
  let transportTotal = 0;
  let foodTotal = 0;
  let electricityTotal = 0;
  let grandTotal = 0;

  sortedLogs.forEach(log => {
    transportTotal += log.transport_emission || 0;
    foodTotal += log.food_emission || 0;
    electricityTotal += log.electricity_emission || 0;
    grandTotal += log.total_emission || 0;
  });

  if (grandTotal > 0) {
    const transportPct = (transportTotal / grandTotal) * 100;
    const foodPct = (foodTotal / grandTotal) * 100;
    const electricityPct = (electricityTotal / grandTotal) * 100;

    const categories = [
      { name: 'Transportation', pct: transportPct },
      { name: 'Food', pct: foodPct },
      { name: 'Electricity', pct: electricityPct }
    ];

    categories.sort((a, b) => b.pct - a.pct);
    const dominant = categories[0];
    findings.push(`${dominant.name} contributes ${Math.round(dominant.pct)}% of total emissions`);
  }

  // 3. Trend analysis (Increasing/Decreasing trend)
  // Let's analyze the trend over the last 14 logs (or all logs if we have fewer)
  if (sortedLogs.length >= 4) {
    const mid = Math.floor(sortedLogs.length / 2);
    const olderHalf = sortedLogs.slice(0, mid);
    const newerHalf = sortedLogs.slice(mid);

    const getAverage = (arr, field) => arr.reduce((sum, item) => sum + (item[field] || 0), 0) / arr.length;

    // Check overall emission trend
    const olderAvg = getAverage(olderHalf, 'total_emission');
    const newerAvg = getAverage(newerHalf, 'total_emission');

    if (newerAvg > olderAvg * 1.05) {
      findings.push('Increasing emission trend');
    } else if (newerAvg < olderAvg * 0.95) {
      findings.push('Decreasing emission trend');
    }

    // Check if electricity emissions specifically increased over the last 14 days (or logs)
    const olderElectricityAvg = getAverage(olderHalf, 'electricity_emission');
    const newerElectricityAvg = getAverage(newerHalf, 'electricity_emission');
    if (newerElectricityAvg > olderElectricityAvg * 1.05) {
      findings.push(`Electricity emissions increased over the last ${sortedLogs.length} logs`);
    }
  }

  return findings;
}
