import { CarbonLog, User, Profile } from '../repositories/database.models.js';
import {
  calculateWhatIfSavings,
  calculateForecast,
  calculateBaselineMonthlyFootprint
} from '../services/calculation.service.js';
import { detectPatterns } from '../services/pattern.service.js';
import { generateCoachingAdvice } from '../services/coach.service.js';
import { Op } from 'sequelize';

// What-If Scenario Simulator endpoint
export async function getWhatIfSimulation(req, res) {
  const { currentType, replacementType, distance, frequency } = req.query;

  if (!currentType || !replacementType || !distance || !frequency) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Query parameters: currentType, replacementType, distance, and frequency are required.'
    });
  }

  const dist = parseFloat(distance);
  const freq = parseFloat(frequency);

  if (isNaN(dist) || isNaN(freq) || dist < 0 || freq < 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Distance and frequency must be non-negative numbers.'
    });
  }

  const savings = calculateWhatIfSavings(currentType, replacementType, dist, freq);
  return res.json({
    current_type: currentType,
    replacement_type: replacementType,
    distance: dist,
    frequency: freq,
    monthly_reduction_kg: savings.monthlySavings,
    yearly_reduction_kg: savings.yearlySavings
  });
}

// Predictive Carbon Forecast endpoint
export async function getForecast(req, res) {
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId, { include: [{ model: Profile, as: 'profile' }] });

    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Get logs from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const logs = await CarbonLog.findAll({
      where: {
        user_id: user.id,
        date: {
          [Op.gte]: startDateStr
        }
      }
    });

    let dailyAverage = 0;

    if (logs.length > 0) {
      const totalEmissionSum = logs.reduce((sum, log) => sum + log.total_emission, 0);
      dailyAverage = totalEmissionSum / logs.length;
    } else if (user.profile) {
      // Fallback: If no logs yet, calculate daily average from onboarding questionnaire baseline
      const baseline = calculateBaselineMonthlyFootprint(user.profile);
      dailyAverage = baseline.total_emission / 30;
    }

    const forecast = calculateForecast(dailyAverage);

    return res.json({
      daily_average: parseFloat(dailyAverage.toFixed(3)),
      logged_days_count: logs.length,
      monthly_forecast_kg: forecast.monthlyForecast,
      yearly_forecast_kg: forecast.yearlyForecast
    });
  } catch (error) {
    console.error('Get forecast error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

// AI Coach endpoint
export async function getCoaching(req, res) {
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId, { include: [{ model: Profile, as: 'profile' }] });

    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Retrieve all carbon logs for behavioral pattern detection
    const logs = await CarbonLog.findAll({
      where: { user_id: user.id },
      order: [['date', 'ASC']]
    });

    // 1. Compute current footprint & breakdown
    let totalFootprint = 0;
    let transportBreakdown = 0;
    let foodBreakdown = 0;
    let electricityBreakdown = 0;
    let shoppingBreakdown = 0;

    if (logs.length > 0) {
      logs.forEach(log => {
        totalFootprint += log.total_emission;
        transportBreakdown += log.transport_emission;
        foodBreakdown += log.food_emission;
        electricityBreakdown += log.electricity_emission;
        shoppingBreakdown += log.shopping_emission || 0;
      });
      // Normalize to monthly averages or keep cumulative? Let's use average monthly or latest monthly logs.
      // If we have less than 30 logs, we can average them or take cumulative. Let's average to daily and project.
    } else if (user.profile) {
      const baseline = calculateBaselineMonthlyFootprint(user.profile);
      totalFootprint = baseline.total_emission;
      transportBreakdown = baseline.transport_emission;
      foodBreakdown = baseline.food_emission;
      electricityBreakdown = baseline.electricity_emission;
      shoppingBreakdown = 0;
    }

    const categoryBreakdown = {
      transport: parseFloat(transportBreakdown.toFixed(3)),
      food: parseFloat(foodBreakdown.toFixed(3)),
      electricity: parseFloat(electricityBreakdown.toFixed(3)),
      shopping: parseFloat(shoppingBreakdown.toFixed(3))
    };

    // 2. Detect behavioral patterns
    const patterns = detectPatterns(logs);

    // 3. Compute moving average forecast
    let dailyAverage = 0;
    if (logs.length > 0) {
      dailyAverage = totalFootprint / logs.length;
    } else if (user.profile) {
      const baseline = calculateBaselineMonthlyFootprint(user.profile);
      dailyAverage = baseline.total_emission / 30;
    }
    const forecast = calculateForecast(dailyAverage);

    // 4. Invoke Gemini AI Coach
    const coachingAdvice = await generateCoachingAdvice({
      currentFootprint: parseFloat(totalFootprint.toFixed(3)),
      categoryBreakdown,
      patterns,
      forecast
    });

    return res.json({
      coaching_advice: coachingAdvice,
      patterns,
      summary_data: {
        total_logged_emissions: parseFloat(totalFootprint.toFixed(3)),
        category_breakdown: categoryBreakdown,
        forecast
      }
    });
  } catch (error) {
    console.error('AI coaching error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
