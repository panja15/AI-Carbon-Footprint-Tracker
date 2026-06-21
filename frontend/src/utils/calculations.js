export function calculateStreak(logList) {
  if (!logList || logList.length === 0) return 0;
  const dates = [...new Set(logList.map(l => l.date))].sort().reverse();
  
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
    return 0;
  }
  
  let currentStreak = 1;
  let currentDate = new Date(dates[0]);
  
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i]);
    const diffTime = Math.abs(currentDate - prevDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      currentStreak++;
      currentDate = prevDate;
    } else if (diffDays > 1) {
      break;
    }
  }
  return currentStreak;
}

export function getBaselineDailyAverage(profile) {
  if (!profile) return 0;
  const transportFactors = {
    car: 0.192,
    bike: 0.103,
    motorcycle: 0.103,
    metro: 0.027,
    bus: 0.089,
    auto: 0.132,
    auto_rickshaw: 0.132,
    walk: 0,
    walking: 0,
    cycle: 0,
    bicycle: 0,
    flight: 0.255
  };
  const tType = (profile.transport_type || 'walking').toLowerCase().trim().replace(/\s+/g, '_');
  const tFactor = transportFactors[tType] || 0;
  const transportDaily = profile.daily_distance * tFactor;

  const foodFactors = {
    vegetarian: 0.7,
    chicken: 2.4,
    beef: 6.5,
    vegan: 0.4
  };
  const fType = (profile.diet_type || 'vegetarian').toLowerCase().trim();
  const fFactor = foodFactors[fType] || 0;
  const foodDaily = 3 * fFactor;

  const electricityDaily = (profile.electricity_usage * 0.82) / 30;

  return transportDaily + foodDaily + electricityDaily;
}

export function getEcoGrade(dailyAverageScore) {
  if (dailyAverageScore <= 1.5) return { grade: 'A+', color: '#00E676' };
  if (dailyAverageScore <= 2.5) return { grade: 'A', color: '#69F0AE' };
  if (dailyAverageScore <= 3.5) return { grade: 'B', color: '#CCFF90' };
  if (dailyAverageScore <= 4.5) return { grade: 'C', color: '#FFD740' };
  if (dailyAverageScore <= 5.5) return { grade: 'D', color: '#FF6D00' };
  return { grade: 'F', color: '#FF1744' };
}
