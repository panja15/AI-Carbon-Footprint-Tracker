import { GoogleGenerativeAI } from '@google/generative-ai';
import { User, Profile, CarbonLog } from '../repositories/database.models.js';
import { calculateCurrentYou, calculateFutureYou } from '../services/twin.service.js';
import { Op } from 'sequelize';

export async function getTwinData(req, res) {
  const activeUserId = req.user.id;
  try {
    const user = await User.findByPk(activeUserId, {
      include: [{ model: Profile, as: 'profile' }]
    });

    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Retrieve logs from last 30 days
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

    const currentYou = calculateCurrentYou(user.profile, logs);
    const futureYou = calculateFutureYou(
      currentYou,
      user.profile ? user.profile.sustainability_goal || 'reduce_10' : 'reduce_10',
      user.profile
    );

    return res.json({
      currentYou,
      futureYou
    });
  } catch (error) {
    console.error('Fetch twin data error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

export async function getTwinNarrative(req, res) {
  const { currentYou, futureYou, goalType } = req.body;

  if (!currentYou || !futureYou || !goalType) {
    return res.status(400).json({ error: 'Bad Request', message: 'currentYou, futureYou, and goalType are required.' });
  }

  const apiKey = process.env.NODE_ENV === 'test' ? null : process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({ narrative: generateFallbackNarrative(currentYou, futureYou) });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });

    const prompt = `
You are the EcoAI Sustainability Coach.
Please generate an encouraging future lifestyle narrative for the user comparing their Current You vs their Future You profile:
- Current Persona: ${currentYou.persona}
- Current Emissions: ${currentYou.monthlyFootprint} kg CO2/month (${currentYou.annualFootprint.toFixed(1)} kg CO2/year)
- Future Persona: ${futureYou.persona}
- Future Emissions: ${futureYou.monthlyFootprint} kg CO2/month (${futureYou.annualFootprint.toFixed(1)} kg CO2/year)
- Goal Target Selected: ${goalType}
- Estimated Timeline: ${futureYou.timeline}
- Top Required Actions:
${futureYou.requiredChanges.map(c => `  * ${c}`).join('\n')}

Rules:
- Write a short lifestyle narrative explaining how their choices (public transit, diet, home electricity) will translate to their future green persona.
- Under no circumstances should you calculate carbon footprint numbers or run mathematical operations. Rely strictly on the provided calculations.
- Limit output to 120 words.
- Be supportive, warm, and clear.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return res.json({ narrative: responseText.trim() });
  } catch (error) {
    console.error('Gemini narrative generation failed:', error);
    return res.json({ narrative: generateFallbackNarrative(currentYou, futureYou) });
  }
}

function generateFallbackNarrative(currentYou, futureYou) {
  return `### Future Lifestyle Narrative (Local Fallback)
  
Future You relies more on public transportation, adopts mindful energy consumption, and pivots toward green dietary alternatives. These structured changes contribute significantly to your projected carbon reduction of **${futureYou.improvementPercent}%**, elevating your profile status from **${currentYou.persona}** to **${futureYou.persona}** over the next **${futureYou.timeline}**!`;
}
