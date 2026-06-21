import { getJourneyOptions } from '../services/maps.service.js';
import { JourneyHistory, User } from '../repositories/database.models.js';
import { generateJourneyCoachingAdvice } from '../services/coach.service.js';

export async function getJourneyPlan(req, res) {
  const { origin, destination } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Query parameters origin and destination are required.'
    });
  }

  try {
    const options = await getJourneyOptions(origin, destination);

    if (!options || options.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No routes found for the specified origin and destination.'
      });
    }

    // Process options and calculate emissions using factors from SKILLS.md
    const processedOptions = options.map(opt => {
      let co2Kg = null;
      const dist = opt.distanceKm;

      if (opt.mode === 'Driving') {
        co2Kg = parseFloat((dist * 0.192).toFixed(3));
      } else if (opt.mode === 'Metro' || opt.transitType === 'metro') {
        co2Kg = parseFloat((dist * 0.027).toFixed(3));
      } else if (opt.mode === 'Bus' || opt.transitType === 'bus') {
        co2Kg = parseFloat((dist * 0.089).toFixed(3));
      } else if (opt.mode === 'Cycling') {
        co2Kg = 0;
      } else if (opt.mode === 'Walking') {
        co2Kg = 0;
      }

      return {
        mode: opt.mode,
        distanceKm: dist,
        durationSec: opt.durationSec,
        durationText: opt.durationText,
        co2Kg: co2Kg
      };
    });

    // Find driving baseline CO2
    const drivingOption = processedOptions.find(o => o.mode === 'Driving');
    const drivingCo2 = drivingOption ? drivingOption.co2Kg : null;

    // Find lowest carbon option (exclude null/unavailable emissions)
    let bestOption = null;
    let minCo2 = Infinity;

    processedOptions.forEach(opt => {
      if (opt.co2Kg !== null && opt.co2Kg < minCo2) {
        minCo2 = opt.co2Kg;
        bestOption = opt;
      }
    });

    let bestOptionResult = null;
    if (bestOption) {
      let reductionPercent = 0;
      if (drivingCo2 !== null && drivingCo2 > 0 && bestOption.mode !== 'Driving') {
        reductionPercent = Math.round(((drivingCo2 - bestOption.co2Kg) / drivingCo2) * 100);
      }
      bestOptionResult = {
        mode: bestOption.mode,
        reductionPercent: reductionPercent
      };
    }

    return res.json({
      origin,
      destination,
      options: processedOptions,
      bestOption: bestOptionResult
    });
  } catch (error) {
    console.error('Error in getJourneyPlan:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

export async function saveJourney(req, res) {
  const { origin, destination, distanceKm, selectedMode, estimatedEmission } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User session not found' });
    }

    const journey = await JourneyHistory.create({
      user_id: user.id,
      origin,
      destination,
      distanceKm,
      selectedMode,
      estimatedEmission
    });

    return res.status(201).json({
      message: 'Journey saved successfully',
      journey
    });
  } catch (error) {
    console.error('Error in saveJourney:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

export async function getJourneyHistory(req, res) {
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User session not found' });
    }

    const journeys = await JourneyHistory.findAll({
      where: { user_id: user.id },
      order: [['created_at', 'DESC']]
    });

    return res.json(journeys);
  } catch (error) {
    console.error('Error in getJourneyHistory:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

export async function getJourneyCoaching(req, res) {
  const { origin, destination, options, bestOption } = req.body;

  if (!origin || !destination || !options) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Origin, destination, and options are required in body.'
    });
  }

  try {
    const coachingAdvice = await generateJourneyCoachingAdvice({
      origin,
      destination,
      options,
      bestOption
    });

    return res.json({ coaching_advice: coachingAdvice });
  } catch (error) {
    console.error('Error in getJourneyCoaching:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
