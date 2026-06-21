import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Generate sustainability coaching recommendations using Gemini.
 * 
 * @param {object} data 
 * @param {number} data.currentFootprint - Current monthly/daily carbon footprint (kg CO2)
 * @param {object} data.categoryBreakdown - Breakdown of emissions { transport, food, electricity }
 * @param {Array<string>} data.patterns - Detected patterns (weekend spikes, trends, etc)
 * @param {object} data.forecast - Projected emissions { monthlyForecast, yearlyForecast }
 * @returns {Promise<string>} Gemini response text (limited to 200 words)
 */
/**
 * Generate a high-quality data-driven fallback advice if Gemini API is unavailable.
 */
function generateFallbackAdvice(data) {
  const recommendations = [];
  const drivers = [];
  
  const transport = data.categoryBreakdown?.transport || 0;
  const food = data.categoryBreakdown?.food || 0;
  const electricity = data.categoryBreakdown?.electricity || 0;

  if (transport >= food && transport >= electricity) {
    drivers.push("Transportation emissions");
    recommendations.push("Consider swapping short commutes with walking, cycling, or public transit.");
    recommendations.push("For longer commutes, carpooling or using a fuel-efficient/electric vehicle will significantly reduce your footprint.");
  } else if (electricity >= transport && electricity >= food) {
    drivers.push("Household electricity usage");
    recommendations.push("Switch to energy-efficient LED lighting and unplug vampire appliances when not in use.");
    recommendations.push("If possible, transition to renewable energy sources or check if your utility provider offers a green energy option.");
  } else {
    drivers.push("Dietary/Food carbon footprint");
    recommendations.push("Incorporate more plant-based meals into your diet to lower agricultural and methane impact.");
    recommendations.push("Minimize food waste by planning meals ahead, storing food properly, and composting.");
  }

  // Additional recommendations
  if (food > transport && food > 0) {
    recommendations.push("Reduce consumption of high-impact meats (like beef and lamb) in favor of poultry or fish.");
  }
  if (electricity > 100) {
    recommendations.push("Improve your home insulation and optimize thermostat settings to reduce heating/cooling energy.");
  }

  const monthlyForecast = data.forecast?.monthlyForecast || 0;

  return `### AI Coach Analysis (Fallback Mode)

**Primary Driver:** ${drivers.join(', ')}

**Recommended Actions:**
${recommendations.map(r => `- ${r}`).join('\n')}

*Note: Your projected monthly footprint is ${monthlyForecast.toFixed(1)} kg CO2. Implementing these changes could reduce your annual projection by up to 15-20%.*`;
}

export async function generateCoachingAdvice(data) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not defined. Returning data-driven fallback recommendations.');
    return generateFallbackAdvice(data);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
You are the EcoAI Sustainability Coach. Analyze the following carbon footprint profile:
- Current Monthly Footprint: ${data.currentFootprint} kg CO2
- Category Breakdown:
  * Transportation: ${data.categoryBreakdown?.transport || 0} kg CO2
  * Food: ${data.categoryBreakdown?.food || 0} kg CO2
  * Electricity: ${data.categoryBreakdown?.electricity || 0} kg CO2
- Detected Behavioral Patterns:
${data.patterns?.map(p => `  * ${p}`).join('\n') || '  * No significant patterns detected yet.'}
- Forecasted Footprint:
  * Monthly: ${data.forecast?.monthlyForecast || 0} kg CO2
  * Annual: ${data.forecast?.yearlyForecast || 0} kg CO2

Based on this data, please provide:
1. The top emission drivers.
2. Personalized recommendations for reductions.
3. High-impact suggested actions.

Rules:
- Keep the entire output strictly under 200 words.
- Focus on practical, actionable advice tailored to the category breakdown and behavioral findings.
- Under no circumstances should you calculate carbon footprint numbers or run mathematical forecast operations. Rely on the provided calculations.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return responseText.trim();
  } catch (error) {
    console.error('Error generating AI coach advice from Gemini API:', error);
    console.warn('Falling back to local data-driven coaching generator.');
    return generateFallbackAdvice(data);
  }
}

export async function generateJourneyCoachingAdvice(journeyData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not defined. Returning fallback journey advice.');
    return generateJourneyFallbackAdvice(journeyData);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
You are the EcoAI Journey Sustainability Coach. Analyze the following travel journey comparison results from "${journeyData.origin}" to "${journeyData.destination}":
${journeyData.options.map(opt => `- ${opt.mode}: Distance ${opt.distanceKm} km, Duration ${opt.durationText}, Carbon Emission ${opt.co2Kg !== null ? `${opt.co2Kg} kg CO2` : 'Unavailable'}`).join('\n')}

Lowest Carbon Option: ${journeyData.bestOption?.mode}
Savings Percentage compared with Driving: ${journeyData.bestOption?.reductionPercent || 0}%

Please provide:
1. A short explanation of the carbon impact difference between these options.
2. A personalized recommendation for this journey.
3. Practical travel advice (e.g. comfort, cost, health benefits) using local Indian context if appropriate (such as Delhi Metro, local traffic, etc.).

Rules:
- Keep the entire output strictly under 150 words.
- Under no circumstances should you calculate carbon footprint numbers or run mathematical forecast operations. Rely on the provided calculations.
- Be encouraging and actionable.
`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Error generating AI journey coaching:', error);
    return generateJourneyFallbackAdvice(journeyData);
  }
}

function generateJourneyFallbackAdvice(journeyData) {
  const bestMode = journeyData.bestOption?.mode || 'Walking/Metro';
  const pct = journeyData.bestOption?.reductionPercent || 0;
  return `### AI Journey Travel Advice (Fallback)

Swapping to **${bestMode}** for your commute from ${journeyData.origin} to ${journeyData.destination} offers the lowest carbon footprint, saving up to **${pct}%** compared with driving. 

**Personalized Recommendations:**
- If taking public transit like the **Delhi Metro**, you bypass peak-hour congestion while keeping emissions minimal.
- For short distances, walking or cycling provides double benefits for personal health and local air quality.
- If driving is necessary, carpooling or timing travel outside gridlock hours reduces idle emissions.`;
}
